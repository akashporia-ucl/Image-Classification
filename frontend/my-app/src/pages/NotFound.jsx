// File: src/pages/NotFound.jsx
import React from "react";
import { Link } from "react-router-dom";
import "./styles.css";

const NotFound = () => (
    <div className="auth-card">
        <h2>404 - Page Not Found</h2>
        <p className="subtext">
            Oops! The page you're looking for doesn't exist.
        </p>
        <Link
            to="/"
            className="btn-gradient"
            style={{ textDecoration: "none" }}
        >
            Go to Landing Page
        </Link>
    </div>
);

export default NotFound;
