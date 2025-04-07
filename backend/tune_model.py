#!/usr/bin/env python3
import time
import argparse
import tensorflow as tf
import numpy as np
import pandas as pd
from pyspark.sql import SparkSession
from pyspark.sql.functions import col

def load_pretrained_model(model_name):
    """Loads a pretrained model (without top layers) and adds a custom binary classification head."""
    if model_name.lower() == "resnet50":
        base_model = tf.keras.applications.ResNet50(
            weights='imagenet',
            include_top=False,
            input_shape=(224, 224, 3)
        )
        target_size = (224, 224)
    elif model_name.lower() == "inceptionv3":
        base_model = tf.keras.applications.InceptionV3(
            weights='imagenet',
            include_top=False,
            input_shape=(299, 299, 3)
        )
        target_size = (299, 299)
    elif model_name.lower() == "vgg16":
        base_model = tf.keras.applications.VGG16(
            weights='imagenet',
            include_top=False,
            input_shape=(224, 224, 3)
        )
        target_size = (224, 224)
    else:
        raise ValueError("Unsupported model name")
    
    # Create a custom head for binary classification
    x = tf.keras.layers.GlobalAveragePooling2D()(base_model.output)
    x = tf.keras.layers.Dropout(0.5)(x)
    predictions = tf.keras.layers.Dense(1, activation='sigmoid')(x)
    model = tf.keras.Model(inputs=base_model.input, outputs=predictions)
    
    # Freeze the base model layers
    for layer in base_model.layers:
        layer.trainable = False
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
        loss='binary_crossentropy',
        metrics=['accuracy']
    )
    return model, target_size

def preprocess_image(image_path, target_size):
    """Loads and preprocesses an image to the required target size."""
    image = tf.io.read_file(image_path)
    image = tf.image.decode_jpeg(image, channels=3)
    image = tf.image.resize(image, target_size)
    # Using ResNet50 preprocessing for consistency
    image = tf.keras.applications.resnet50.preprocess_input(image)
    return image

def load_dataset(image_paths, labels, batch_size, target_size):
    """Creates a tf.data.Dataset from image paths and labels."""
    ds = tf.data.Dataset.from_tensor_slices((image_paths, labels))
    def _process(path, label):
        img = preprocess_image(path, target_size)
        return img, label
    ds = ds.map(_process, num_parallel_calls=tf.data.AUTOTUNE)
    ds = ds.batch(batch_size).prefetch(tf.data.AUTOTUNE)
    return ds

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data_csv', required=True,
                        help="HDFS path to CSV file with columns: image_path, label (e.g. hdfs://management:9000/path/to/data.csv)")
    parser.add_argument('--model_save_path', required=True,
                        help="HDFS directory path to save the best tuned model (e.g. hdfs://management:9000/path/to/save/model)")
    parser.add_argument('--metadata_output', required=True,
                        help="HDFS directory path to store model metadata (as CSV). e.g. hdfs://management:9000/path/to/model_metadata")
    parser.add_argument('--tuning_hours', type=float, default=24,
                        help="Total tuning time in hours (default: 24)")
    parser.add_argument('--batch_size', type=int, default=32,
                        help="Batch size for training (default: 32)")
    args = parser.parse_args()
    
    # Create Spark Session
    spark = (SparkSession.builder
             .appName("ModelTuning")
             .getOrCreate())
    
    # Read CSV from HDFS
    df = spark.read.option("header", "true").csv(args.data_csv)
    df = df.withColumn("label", col("label").cast("int"))
    
    # Collect data to driver as a Pandas DataFrame
    data_pd = df.toPandas()
    
    # Shuffle and split data: 60% train, 20% validation, 20% test.
    data_pd = data_pd.sample(frac=1, random_state=42)  # shuffle
    n = len(data_pd)
    train_df = data_pd.iloc[:int(0.6 * n)]
    val_df = data_pd.iloc[int(0.6 * n):int(0.8 * n)]
    test_df = data_pd.iloc[int(0.8 * n):]
    
    train_paths = train_df['image_path'].tolist()
    train_labels = train_df['label'].tolist()
    val_paths = val_df['image_path'].tolist()
    val_labels = val_df['label'].tolist()
    test_paths = test_df['image_path'].tolist()
    test_labels = test_df['label'].tolist()
    
    # Candidate pretrained models
    candidate_models = ["resnet50", "inceptionv3", "vgg16"]
    best_val_acc = 0.0
    best_model = None
    best_candidate = None
    best_target_size = (224, 224)
    
    total_tuning_time = args.tuning_hours * 3600  # seconds
    tuning_start_time = time.time()
    
    # Tuning loop: iterate over candidate models until time is up.
    while time.time() - tuning_start_time < total_tuning_time:
        for candidate in candidate_models:
            print(f"Training candidate: {candidate}")
            model, target_size = load_pretrained_model(candidate)
            
            # Prepare tf.data datasets
            current_train_ds = load_dataset(train_paths, train_labels, args.batch_size, target_size)
            current_val_ds = load_dataset(val_paths, val_labels, args.batch_size, target_size)
            
            # Train for 1 epoch each iteration (example)
            history = model.fit(current_train_ds, validation_data=current_val_ds, epochs=1, verbose=1)
            val_loss, val_acc = model.evaluate(current_val_ds, verbose=0)
            print(f"Candidate: {candidate}, Validation Accuracy: {val_acc:.4f}")
            
            # Update best model if current candidate improved
            if val_acc > best_val_acc:
                best_val_acc = val_acc
                best_model = model
                best_candidate = candidate
                best_target_size = target_size
            
            # Stop if tuning time is exceeded
            if time.time() - tuning_start_time >= total_tuning_time:
                break
    
    # Evaluate best model on test dataset
    if best_model is not None:
        print(f"Best model candidate: {best_candidate} with Validation Accuracy: {best_val_acc:.4f}")
        test_ds = load_dataset(test_paths, test_labels, args.batch_size, best_target_size)
        test_loss, test_acc = best_model.evaluate(test_ds, verbose=1)
        print(f"Test Accuracy: {test_acc:.4f}")
    else:
        print("No model was tuned.")
        spark.stop()
        return
    
    # Save the best tuned model to HDFS (ensure TensorFlow is built with HDFS support)
    best_model.save(args.model_save_path)
    print(f"Best model saved at: {args.model_save_path}")
    
    # === Publish metadata in HDFS as CSV using Spark ===
    # We'll create a small Pandas DataFrame with the metadata, then convert to Spark DataFrame to write to HDFS.
    metadata_dict = {
        "model_candidate": [best_candidate],
        "model_path": [args.model_save_path],
        "tuning_hours": [args.tuning_hours],
        "best_val_accuracy": [best_val_acc],
        "test_accuracy": [test_acc]
    }
    metadata_pd = pd.DataFrame(metadata_dict)
    
    # Convert to a Spark DataFrame
    metadata_spark_df = spark.createDataFrame(metadata_pd)
    
    # Write to HDFS in CSV format with a header (coalesce to create just one file).
    (metadata_spark_df
     .coalesce(1)
     .write
     .mode("overwrite")
     .option("header", "true")
     .csv(args.metadata_output))
    
    print(f"Model metadata written to: {args.metadata_output}")
    
    # Stop the Spark session
    spark.stop()

if __name__ == "__main__":
    main()


# spark-submit \
#   --master yarn \
#   --deploy-mode cluster \
#   --driver-memory 4G \
#   --executor-memory 4G \
#   --executor-cores 2 \
#   --num-executors 3 \
#   train_models.py \
#   --data_csv hdfs://management:9000/path/to/data.csv \
#   --model_save_path hdfs://management:9000/path/to/save/best_model \
#   --metadata_output hdfs://management:9000/path/to/model_metadata \
#   --tuning_hours 24 \
#   --batch_size 32
