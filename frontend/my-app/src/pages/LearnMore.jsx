import React from "react";
import "./styles.css";

const LearnMore = () => {
    return (
        <div className="learn-more-container">
            <h1>Learn More</h1>
            <p>
                This application is built as a full-stack solution for image
                classification. It consists of two main parts: a robust backend
                and a dynamic React frontend.
            </p>

            <h2>Backend Overview</h2>
            <p>The backend is developed using Flask and is responsible for:</p>
            <ul>
                <li>
                    <strong>User Authentication:</strong> It handles user
                    registration and login using JSON Web Tokens (JWT) with
                    endpoints like <code>/register</code> and{" "}
                    <code>/login</code>.
                </li>
                <li>
                    <strong>Image Upload and Prediction:</strong> The{" "}
                    <code>/predict</code> endpoint accepts secure image uploads,
                    stores them, and triggers a Spark job (via{" "}
                    <code>spark_job.py</code>) to process the image. This
                    simulates running an image through a classification model.
                </li>
                <li>
                    <strong>Model Tuning:</strong> The{" "}
                    <code>model_tuning.py</code> script uses TensorFlow and
                    Keras to load candidate pretrained models (such as ResNet50,
                    InceptionV3, and VGG16). It evaluates these models using
                    data ingested with Apache Spark, selects the best performing
                    model, and saves both the model and its metadata (stored in
                    a SQLite database).
                </li>
            </ul>

            <h2>Spark Job Processing</h2>
            <p>
                The <code>spark_job.py</code> script simulates the processing of
                an image by introducing a delay. In a production setup, this
                script would contain the logic to run the image through the
                chosen model for prediction and return the results.
            </p>

            <h2>Frontend Overview</h2>
            <p>
                The frontend is built with React using Create React App. It
                provides a user-friendly interface where users can:
            </p>
            <ul>
                <li>Register and log in securely.</li>
                <li>Upload images for classification.</li>
                <li>View results returned from the backend.</li>
            </ul>

            <h2>Technologies Used</h2>
            <ul>
                <li>
                    Flask &amp; SQLAlchemy for the backend API and database
                    management
                </li>
                <li>JWT for secure authentication</li>
                <li>
                    TensorFlow and Keras for model tuning and image
                    classification
                </li>
                <li>Apache Spark for distributed data processing</li>
                <li>
                    React (Create React App) for the frontend user interface
                </li>
            </ul>

            <p>
                This page provides a behind-the-scenes look at the internal
                architecture and processes that power this image classification
                application. For more technical details, please refer to the
                source code available in the repository.
            </p>
        </div>
    );
};

export default LearnMore;
