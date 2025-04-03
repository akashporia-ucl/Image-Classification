import React from "react";
import { Link } from "react-router-dom";
import "./styles.css";

const Landing = () => {
    return (
        <div className="landing-container">
            <header className="landing-hero">
                <div className="overlay"></div>
                <div className="landing-content">
                    <h1>AI or Human?</h1>
                    <p>
                        Welcome to our AI vs. Human Image Analysis App! This
                        platform leverages cutting-edge machine learning
                        techniques to determine whether an image was created by
                        artificial intelligence or by a human artist.
                    </p>
                    <p>
                        Explore digital art authenticity and gain insights into
                        the creative process. Upload your image to receive an
                        instant prediction and in‐depth analysis.
                    </p>
                    <Link to="/login" className="btn-primary">
                        Try It Now
                    </Link>
                </div>
            </header>

            <footer className="landing-footer">
                <div className="footer-content">
                    <p>&copy; {new Date().getFullYear()} Akash Poria</p>
                    <p>
                        <a
                            href="https://www.kaggle.com/datasets/alessandrasala79/ai-vs-human-generated-dataset"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Dataset Credit
                        </a>{" "}
                        &bull; Inspired by ResNet50, InceptionV3, VGG16 and
                        community research.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
