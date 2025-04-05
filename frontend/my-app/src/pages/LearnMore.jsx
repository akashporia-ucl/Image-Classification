// import React from "react";
// import "./styles.css";
// import { Link } from "react-router-dom";

// const LearnMore = () => {
//     return (
//         <div className="learn-more-container">
//             <Link to="/" className="logo-link">
//                 ← Back to Home
//             </Link>
//             <h1>Learn More</h1>
//             <p>
//                 This application is built as a full-stack solution for image
//                 classification. It consists of two main parts: a robust backend
//                 and a dynamic React frontend.
//             </p>

//             <h2>Backend Overview</h2>
//             <p>The backend is developed using Flask and is responsible for:</p>
//             <ul>
//                 <li>
//                     <strong>User Authentication:</strong> It handles user
//                     registration and login using JSON Web Tokens (JWT) with
//                     endpoints like <code>/register</code> and{" "}
//                     <code>/login</code>.
//                 </li>
//                 <li>
//                     <strong>Image Upload and Prediction:</strong> The{" "}
//                     <code>/predict</code> endpoint accepts secure image uploads,
//                     stores them, and triggers a Spark job (via{" "}
//                     <code>spark_job.py</code>) to process the image. This
//                     simulates running an image through a classification model.
//                 </li>
//                 <li>
//                     <strong>Model Tuning:</strong> The{" "}
//                     <code>model_tuning.py</code> script uses TensorFlow and
//                     Keras to load candidate pretrained models (such as ResNet50,
//                     InceptionV3, and VGG16). It evaluates these models using
//                     data ingested with Apache Spark, selects the best performing
//                     model, and saves both the model and its metadata (stored in
//                     a SQLite database).
//                 </li>
//             </ul>

//             <h2>Spark Job Processing</h2>
//             <p>
//                 The <code>spark_job.py</code> script simulates the processing of
//                 an image by introducing a delay. In a production setup, this
//                 script would contain the logic to run the image through the
//                 chosen model for prediction and return the results.
//             </p>

//             <h2>Frontend Overview</h2>
//             <p>
//                 The frontend is built with React using Create React App. It
//                 provides a user-friendly interface where users can:
//             </p>
//             <ul>
//                 <li>Register and log in securely.</li>
//                 <li>Upload images for classification.</li>
//                 <li>View results returned from the backend.</li>
//             </ul>

//             <h2>Technologies Used</h2>
//             <ul>
//                 <li>
//                     Flask &amp; SQLAlchemy for the backend API and database
//                     management
//                 </li>
//                 <li>JWT for secure authentication</li>
//                 <li>
//                     TensorFlow and Keras for model tuning and image
//                     classification
//                 </li>
//                 <li>Apache Spark for distributed data processing</li>
//                 <li>
//                     React (Create React App) for the frontend user interface
//                 </li>
//             </ul>

//             <p>
//                 This page provides a behind-the-scenes look at the internal
//                 architecture and processes that power this image classification
//                 application. For more technical details, please refer to the
//                 source code available in the repository.
//             </p>
//         </div>
//     );
// };

// export default LearnMore;

import React from "react";
import "./styles.css";
import { Link } from "react-router-dom";

const LearnMore = () => {
    return (
        <div className="learn-more-container">
            <Link to="/" className="logo-link">
                ← Back to Home
            </Link>
            <h1>Learn More</h1>
            <p>
                This application is built as a full-stack solution for image
                classification. It consists of two main parts: a robust backend
                and a dynamic React frontend.
            </p>

            <h2>Backend Overview</h2>
            <p>
                The backend is developed using Flask and is responsible for
                several key functionalities:
            </p>
            <ul>
                <li>
                    <strong>User Authentication:</strong> Handles user
                    registration and login using JSON Web Tokens (JWT) with
                    endpoints like <code>/register</code> and{" "}
                    <code>/login</code>.
                </li>
                <li>
                    <strong>Image Upload and Prediction:</strong> Accepts secure
                    image uploads through the <code>/predict</code> endpoint,
                    stores them, and triggers a Spark job (via{" "}
                    <code>spark_job.py</code>) to simulate image classification.
                </li>
                <li>
                    <strong>Model Tuning:</strong> Utilises TensorFlow and Keras
                    in the <code>model_tuning.py</code> script to load candidate
                    pretrained models (such as ResNet50, InceptionV3, and
                    VGG16), evaluates them using data processed with Apache
                    Spark, and selects the best performing model.
                </li>
            </ul>

            <h2>Detailed Backend Architecture</h2>
            <p>
                Inspired by modern distributed data analysis pipelines, the
                backend architecture is designed for scalability, fault
                tolerance, and efficient processing. Key aspects include:
            </p>
            <ul>
                <li>
                    <strong>Infrastructure Provisioning:</strong> Terraform is
                    used to automate the provisioning of virtual machines for
                    the management, worker, and storage nodes.
                </li>
                <li>
                    <strong>Automation &amp; Configuration:</strong> Ansible
                    automates the setup of the environment including the
                    installation of necessary tools (Python, Java, Spark, etc.)
                    and the configuration of the system.
                </li>
                <li>
                    <strong>Distributed Processing with Apache Spark:</strong>{" "}
                    The backend simulates distributed image processing where
                    Spark partitions the workload across multiple nodes to
                    accelerate computation. This method ensures that even large
                    image datasets can be processed in parallel, reducing
                    overall prediction time.
                </li>
                <li>
                    <strong>Model Tuning and Selection:</strong> The{" "}
                    <code>model_tuning.py</code> script evaluates multiple
                    models by running Spark jobs and then selects and saves the
                    best performing model along with its metadata.
                </li>
                <li>
                    <strong>Monitoring &amp; Logging:</strong> Real-time system
                    performance is monitored using Prometheus and Grafana. These
                    tools track CPU, memory, and disk usage, ensuring that the
                    backend operates efficiently and that any issues are quickly
                    identified.
                </li>
                <li>
                    <strong>Security &amp; Scalability:</strong> Secure access
                    is maintained using JWT for user authentication and SSH
                    key-based communications between nodes. The system is
                    designed to scale horizontally by adding more worker nodes
                    as needed.
                </li>
            </ul>

            <h3>Architecture Diagram</h3>
            <p>
                The image below provides a high-level overview of the backend
                architecture:
            </p>
            <div className="image-container">
                <img
                    src="/assets/backend-architecture.png"
                    alt="Backend Architecture Diagram showing Terraform provisioning, Ansible automation, Spark distributed processing, and monitoring with Prometheus and Grafana"
                />
            </div>

            <h2>Spark Job Processing</h2>
            <p>
                The <code>spark_job.py</code> script simulates image processing
                by introducing a delay. In a production environment, this script
                would handle the logic of running the uploaded image through the
                selected model to generate predictions.
            </p>

            <h2>Frontend Overview</h2>
            <p>
                The frontend is built with React (using Create React App) and
                provides a user-friendly interface where users can:
            </p>
            <ul>
                <li>Register and log in securely.</li>
                <li>Upload images for classification.</li>
                <li>
                    View the classification results returned from the backend.
                </li>
            </ul>

            <h2>Technologies Used</h2>
            <ul>
                <li>
                    Flask &amp; SQLAlchemy for backend API and database
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
                <li>
                    Terraform and Ansible for infrastructure provisioning and
                    automation
                </li>
                <li>
                    Prometheus and Grafana for real-time monitoring and logging
                </li>
            </ul>

            <p>
                This enhanced overview provides insight into the robust and
                scalable backend that powers the image classification process.
                For more technical details, please refer to the source code and
                the system documentation in the repository.
            </p>
        </div>
    );
};

export default LearnMore;
