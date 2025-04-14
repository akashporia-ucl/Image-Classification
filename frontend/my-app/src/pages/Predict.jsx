import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./styles.css";
import io from "socket.io-client";
import { useWebSocket } from "../component/WebSocketProvider";

const Predict = () => {
    const [image, setImage] = useState(null);
    const [result, setResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    // const [message, setMessage] = useState("");
    // const [buttonEnabled, setButtonEnabled] = useState(false);

    const { message, buttonEnabled } = useWebSocket();

    const baseURL =
        process.env.REACT_APP_USERNAME != null
            ? "https://flask-" +
              process.env.REACT_APP_USERNAME +
              ".comp0235.condenser.arc.ucl.ac.uk/"
            : "http://localhost:3500/";

    const predictURL = baseURL + "predict";

    // Initialize socket connection only once
    //const socket = io(baseURL);

    // useEffect(() => {
    //     // Log when the socket connects
    //     socket.on("connect", () => {
    //         console.log("Socket connected with id:", socket.id);
    //     });

    //     // Log disconnections
    //     socket.on("disconnect", () => {
    //         console.log("Socket disconnected");
    //     });

    //     // Log any messages received from RabbitMQ via the server
    //     socket.on("rabbitmq_message", (msg) => {
    //         console.log("Received message from RabbitMQ:", msg);
    //         setMessage(msg);
    //         setButtonEnabled(true);
    //     });

    //     return () => {
    //         socket.off("connect");
    //         socket.off("disconnect");
    //         socket.off("rabbitmq_message");
    //     };
    // }, [socket]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        setErrorMsg("");
        if (!file || !file.type.startsWith("image/")) {
            setErrorMsg("Please upload a valid image file");
            return;
        }
        setImage(file);
    };

    const handlePredictSubmit = async (e) => {
        e.preventDefault();

        if (!image) {
            setErrorMsg("Please upload an image");
            return;
        }

        const formData = new FormData();
        formData.append("file", image);

        setLoading(true);
        setErrorMsg("");
        setResult(null);

        try {
            const res = await fetch(predictURL, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: formData,
            });
            const data = await res.json();

            if (res.ok) {
                setResult(data);
            } else {
                setErrorMsg(data.msg || "Prediction failed");
            }
        } catch (err) {
            setErrorMsg("Network error during prediction");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/");
    };

    return (
        <div className="auth-card">
            <h2>Classify Image</h2>
            <p className="subtext">
                Upload an image to determine if it's AI-generated or human-made.
            </p>
            {errorMsg && <p className="error-msg">{errorMsg}</p>}
            <form onSubmit={handlePredictSubmit}>
                <input
                    type="file"
                    accept="image/*"
                    multiple={false}
                    onChange={handleImageChange}
                    required
                />
                <button
                    type="submit"
                    className="btn-gradient"
                    disabled={!buttonEnabled}
                >
                    {loading ? "Getting prediction..." : "Classify"}
                </button>
            </form>
            <button
                className="btn-gradient logout-button"
                onClick={handleLogout}
            >
                Logout
            </button>
            {result && (
                <div className="result">
                    <h3>Result:</h3>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
            {!buttonEnabled && (
                <p className="subtext">
                    Waiting for Model training to complete...
                </p>
            )}
        </div>
    );
};

export default Predict;
