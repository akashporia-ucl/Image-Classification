import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useNavigate, Link } from "react-router-dom";
import { useWebSocket } from "../component/WebSocketProvider";
import "./styles.css";

// Register necessary chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const Stats = () => {
    const { pageActive } = useWebSocket();
    const navigate = useNavigate();
    const [mode, setMode] = useState("train"); // New state: "train" or "test"
    const [tableData, setTableData] = useState([]);
    const [stats, setStats] = useState({ total: 0, correct: 0, incorrect: 0 });
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Construct the CSV URL based on the mode and environment variable.
    const csvURL =
        process.env.REACT_APP_USERNAME != null
            ? `https://flask-${
                  process.env.REACT_APP_USERNAME
              }.comp0235.condenser.arc.ucl.ac.uk/${
                  mode === "train" ? "csv_train" : "csv_test"
              }`
            : `http://localhost:3500/${
                  mode === "train" ? "csv_train" : "csv_test"
              }`;

    // Navigate to notfound page if pageActive is false
    useEffect(() => {
        if (!pageActive) {
            navigate("/notfound");
        }
    }, [pageActive, navigate]);

    // Fetch CSV file using async/await inside useEffect whenever the CSV URL changes.
    useEffect(() => {
        const fetchCSV = async () => {
            setLoading(true);
            setErrorMsg("");
            try {
                const res = await fetch(csvURL, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                });
                // If the response is not OK, capture the error message and exit early.
                if (!res.ok) {
                    const errData = await res.json();
                    setErrorMsg(errData.msg || "CSV file fetch failed");
                    return;
                }
                const csvText = await res.text();
                Papa.parse(csvText, {
                    complete: (result) => {
                        const data = result.data;
                        // Assume first row is headers
                        const parsedData = data.slice(1).map((row) => ({
                            file_name: row[0],
                            true_label: row[1],
                            pred_label: row[2],
                            correct: row[3] === "1" ? 1 : 0,
                        }));

                        const total = parsedData.length;
                        const correct = parsedData.filter(
                            (row) => row.correct === 1
                        ).length;
                        const incorrect = total - correct;

                        setTableData(parsedData);
                        setStats({ total, correct, incorrect });
                    },
                    header: false,
                    skipEmptyLines: true,
                });
            } catch (error) {
                console.error("Error loading CSV file:", error);
                setErrorMsg("Network error during CSV fetch");
            } finally {
                setLoading(false);
            }
        };

        fetchCSV();
    }, [csvURL]);

    const getDoughnutChartData = () => {
        return {
            labels: ["Correct", "Incorrect"],
            datasets: [
                {
                    data: [stats.correct, stats.incorrect],
                    backgroundColor: ["#36A2EB", "#FF6384"],
                    hoverBackgroundColor: ["#36A2EB", "#FF6384"],
                },
            ],
        };
    };

    return (
        <div className="stats-container">
            <Link to="/predict" className="logo-link">
                ← Back to Predict
            </Link>
            <h1>CSV File Viewer & Stats</h1>

            {/* Mode Toggle Buttons */}
            <div className="mode-toggle">
                <button
                    onClick={() => setMode("train")}
                    disabled={mode === "train"}
                >
                    Train Stats
                </button>
                <button
                    onClick={() => setMode("test")}
                    disabled={mode === "test"}
                >
                    Test Stats
                </button>
            </div>

            {loading && <p>Loading CSV data...</p>}
            {errorMsg && <div className="error-msg">{errorMsg}</div>}

            {/* Table Display */}
            {tableData.length > 0 && (
                <div>
                    <h2>
                        File Data (
                        {mode.charAt(0).toUpperCase() + mode.slice(1)} Stats)
                    </h2>
                    <table className="stats-table">
                        <thead>
                            <tr>
                                <th>File Name</th>
                                <th>True Label</th>
                                <th>Predicted Label</th>
                                <th>Correct</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row, index) => (
                                <tr key={index}>
                                    <td>{row.file_name}</td>
                                    <td>{row.true_label}</td>
                                    <td>{row.pred_label}</td>
                                    <td>{row.correct === 1 ? "Yes" : "No"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Stats Display */}
            {stats.total > 0 && (
                <div className="stats-section">
                    <h2>Statistics</h2>
                    <p>Total: {stats.total}</p>
                    <p>Correct Predictions: {stats.correct}</p>
                    <p>Incorrect Predictions: {stats.incorrect}</p>
                    <Doughnut data={getDoughnutChartData()} />
                </div>
            )}
        </div>
    );
};

export default Stats;
