import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./styles.css";

const Signup = () => {
    const [form, setForm] = useState({
        username: "",
        password: "",
        confirmPassword: "",
    });
    const [errorMsg, setErrorMsg] = useState("");
    const navigate = useNavigate();

    const signupURL =
        process.env.REACT_APP_USERNAME != null
            ? "https://flask-" +
              process.env.REACT_APP_USERNAME +
              ".comp0235.condenser.arc.ucl.ac.uk/register"
            : "http://localhost:3500/register";

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setErrorMsg(""); // clear error on new input
    };

    const handleSignupSubmit = async (e) => {
        e.preventDefault();

        if (form.password !== form.confirmPassword) {
            setErrorMsg("Passwords do not match");
            return;
        }

        try {
            const res = await fetch(signupURL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: form.username,
                    password: form.password,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                navigate("/predict");
            } else {
                setErrorMsg(data.msg || "Signup failed");
            }
        } catch (err) {
            setErrorMsg("Network error during signup");
        }
    };

    return (
        <div className="auth-card">
            <Link to="/" className="logo-link">
                ← Back to Home
            </Link>
            <h2>Create Account</h2>
            <p className="subtext">
                Sign up to begin detecting AI-generated images
            </p>
            {errorMsg && <p className="error-msg">{errorMsg}</p>}
            <form onSubmit={handleSignupSubmit}>
                <input
                    name="username"
                    type="text"
                    placeholder="Username"
                    onChange={handleChange}
                    required
                />
                <input
                    name="password"
                    type="password"
                    placeholder="Password"
                    onChange={handleChange}
                    required
                />
                <input
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm Password"
                    onChange={handleChange}
                    required
                />
                <button type="submit" className="btn-gradient">
                    Sign Up
                </button>
                <p className="auth-footer">
                    Already a member? <Link to="/login">Login</Link>
                </p>
            </form>
        </div>
    );
};

export default Signup;
