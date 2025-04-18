import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./styles.css";
import { useWebSocket } from "../component/WebSocketProvider";
import { Download } from "lucide-react";

const Predict = () => {
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const imageList = ["AI.jpg", "Human.jpg"];
    const { message, buttonEnabled } = useWebSocket();

    const baseURL = process.env.REACT_APP_USERNAME
        ? `https://flask-${process.env.REACT_APP_USERNAME}.comp0235.condenser.arc.ucl.ac.uk/`
        : "http://localhost:3500/";
    const predictURL = baseURL + "predict";

    useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        setErrorMsg("");
        setResult(null);

        if (!file?.type.startsWith("image/")) {
            setErrorMsg("Please upload a valid image file");
            return setPreview(null);
        }
        if (file.size > 1024 * 1024) {
            setErrorMsg("Image size too large. Maximum allowed size is 1 MB.");
            return setPreview(null);
        }

        if (
            file.type !== "image/jpeg" &&
            file.type !== "image/png" &&
            file.type !== "image/webp"
        ) {
            setErrorMsg(
                "Unsupported image format. Please upload a JPEG, PNG, or WEBP image."
            );
            return setPreview(null);
        }

        setImage(file);
        setPreview(URL.createObjectURL(file));
    };

    const handlePredictSubmit = async (e) => {
        e.preventDefault();
        if (!image) return setErrorMsg("Please upload an image");

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
            console.log(data);
            res.ok
                ? setResult(data)
                : setErrorMsg(data.msg || "Prediction failed");
        } catch {
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
                Upload an image to determine if it’s AI‑generated or human‑made.
            </p>

            <p className="subtext">{message}</p>

            {errorMsg && <p className="error-msg">{errorMsg}</p>}

            <div className="download-group">
                <p className="subtext" style={{ fontWeight: "bold" }}>
                    Download sample images to test the model:
                </p>
                {imageList.map((fileName) => {
                    const src = `${process.env.PUBLIC_URL}/${fileName}`;
                    return (
                        <a
                            key={fileName}
                            href={src}
                            download={fileName}
                            className="download-icon-btn"
                            aria-label={`Download ${fileName}`}
                        >
                            <Download size={20} /> {fileName}
                        </a>
                    );
                })}
            </div>

            <form onSubmit={handlePredictSubmit}>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    required
                    className="my-file-input"
                />

                {preview && (
                    <div className="preview-wrapper">
                        <img
                            src={preview}
                            alt="Upload preview"
                            className="image-preview"
                        />
                    </div>
                )}

                <button
                    type="submit"
                    className="btn-gradient"
                    disabled={!buttonEnabled}
                >
                    {loading ? "Getting prediction..." : "Classify"}
                </button>
            </form>

            <div className="button-group">
                <button
                    className="btn-gradient"
                    disabled={!buttonEnabled}
                    onClick={() => navigate("/stats")}
                >
                    View Statistics
                </button>
                <button
                    className="btn-gradient logout-button"
                    onClick={handleLogout}
                >
                    Logout
                </button>
            </div>

            {result && (
                <div className="result">
                    <h3>Result:</h3>
                    <pre className="result-text">
                        {result.Result === "1"
                            ? "AI‑generated"
                            : "Human‑generated"}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default Predict;
