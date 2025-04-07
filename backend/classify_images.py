#!/usr/bin/env python3
import argparse
import tensorflow as tf
import numpy as np

from pyspark.sql import SparkSession, Row
from pyspark.sql.functions import col

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model_path', required=True,
                        help="HDFS path where the best model is stored (SavedModel format).")
    parser.add_argument('--data_csv', required=True,
                        help="HDFS path to CSV with a column 'image_path'.")
    parser.add_argument('--output_csv', required=True,
                        help="HDFS directory path to store classification results (CSV).")
    parser.add_argument('--image_size', default='224,224',
                        help="Target (height,width) for image resizing (match your model). e.g. '224,224' or '299,299'.")
    parser.add_argument('--num_partitions', type=int, default=0,
                        help="Optional: coalesce or repartition the DataFrame to this number of partitions. 0 means do nothing.")
    args = parser.parse_args()
    
    # Parse image size
    height, width = map(int, args.image_size.split(','))
    target_size = (height, width)
    
    # 1. Start Spark
    spark = SparkSession.builder.appName("DistributedImageClassification").getOrCreate()
    
    # 2. Read the CSV from HDFS (must have at least one column: 'image_path')
    df = spark.read.option("header", "true").csv(args.data_csv)
    
    # If needed, reduce or increase partitions for better performance
    if args.num_partitions > 0:
        df = df.coalesce(args.num_partitions)
    
    # 3. Broadcast the model path + other constants to all executors
    bc_model_path = spark.sparkContext.broadcast(args.model_path)
    bc_target_size = spark.sparkContext.broadcast(target_size)
    
    # 4. Define a function that runs inference over all rows in a partition
    def inference_partition(rows_iter):
        """
        rows_iter: An iterator of Row objects, each presumably with 'image_path'.
        We'll load the model once per partition, then run inference on each image.
        """
        import tensorflow as tf  # ensure TF is available on executors
        
        model_path = bc_model_path.value
        target_h, target_w = bc_target_size.value
        
        # Load the model once per partition
        # If your TF build supports HDFS, it can load directly from hdfs://...
        model = tf.keras.models.load_model(model_path)
        
        results = []
        for row in rows_iter:
            image_path = row.image_path
            if not image_path:
                continue
            
            # Preprocess the image (single example). You could also batch them.
            image = tf.io.read_file(image_path)
            image = tf.image.decode_jpeg(image, channels=3)
            image = tf.image.resize(image, (target_h, target_w))
            # Use the same preprocessing you did in training (e.g., ResNet50)
            image = tf.keras.applications.resnet50.preprocess_input(image)
            
            # Expand dims -> shape [1, h, w, c]
            image = tf.expand_dims(image, axis=0)
            
            # Predict
            pred = model.predict(image)[0][0]
            # If it's a binary classifier, threshold at 0.5 for class
            predicted_class = int(pred >= 0.5)
            
            # Collect results as a tuple
            results.append(Row(
                image_path=image_path,
                raw_prediction=float(pred),
                predicted_class=predicted_class
            ))
        
        return results
    
    # Convert to an RDD so we can use mapPartitions
    rdd = df.rdd.mapPartitions(inference_partition)
    
    # Convert the resulting RDD of Rows back to a Spark DataFrame
    result_df = spark.createDataFrame(rdd)
    
    # 5. Write results to HDFS as CSV
    (result_df
        .coalesce(1)
        .write
        .mode("overwrite")
        .option("header", "true")
        .csv(args.output_csv))
    
    spark.stop()

if __name__ == "__main__":
    main()


# spark-submit \
#   --master yarn \
#   --deploy-mode cluster \
#   --driver-memory 2G \
#   --executor-memory 4G \
#   --executor-cores 2 \
#   --num-executors 3 \
#   distributed_classify.py \
#   --model_path hdfs://management:9000/path/to/save/best_model \
#   --data_csv hdfs://management:9000/path/to/inference_data.csv \
#   --output_csv hdfs://management:9000/path/to/output_predictions \
#   --image_size 224,224 \
#   --num_partitions 3
