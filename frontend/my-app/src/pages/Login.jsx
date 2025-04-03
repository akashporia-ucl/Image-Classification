import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./styles.css";

const Login = () => {
    const [form, setForm] = useState({ username: "", password: "" });
    const [errorMsg, setErrorMsg] = useState("");
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setErrorMsg(""); // Clear error when user types
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();

        try {
            const res = await fetch("http://localhost:3500/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: form.username,
                    password: form.password,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem("token", data.access_token);
                navigate("/predict");
            } else {
                setErrorMsg(data.msg || "Login failed");
            }
        } catch (err) {
            setErrorMsg("Network error during login");
        }
    };

    return (
        <div className="auth-card">
            <Link to="/" className="logo-link">
                ← Back to Home
            </Link>
            <h2>Welcome Back</h2>
            <p className="subtext">
                Login to classify images as AI or Human-generated
            </p>
            {errorMsg && <p className="error-msg">{errorMsg}</p>}
            <form onSubmit={handleLoginSubmit}>
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
                <button type="submit" className="btn-gradient">
                    Login
                </button>
                <p className="auth-footer">
                    New here? <Link to="/signup">Sign up</Link>
                </p>
            </form>
        </div>
    );
};

export default Login;
