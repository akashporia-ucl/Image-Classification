// Stats.jsx

import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { Doughnut, Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
} from "chart.js";
import { useNavigate, Link } from "react-router-dom";
import { useWebSocket } from "../component/WebSocketProvider";
import "./styles.css";

// Register Chart.js components
ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement
);

const Stats = () => {
    const { pageActive } = useWebSocket();
    const navigate = useNavigate();

    const [mode, setMode] = useState("train");
    const [tableData, setTableData] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        correct: 0,
        incorrect: 0,
        falsePositives: 0,
        falseNegatives: 0,
        trueLabelCounts: {},
        predLabelCounts: {},
        precisionByLabel: {},
        recallByLabel: {},
        f1ByLabel: {},
    });
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [visibleCount, setVisibleCount] = useState(20);

    // Build CSV endpoint URL
    const csvURL = process.env.REACT_APP_USERNAME
        ? `https://flask-${
              process.env.REACT_APP_USERNAME
          }.comp0235.condenser.arc.ucl.ac.uk/${
              mode === "train" ? "csv_train" : "csv_test"
          }`
        : `http://localhost:3500/${
              mode === "train" ? "csv_train" : "csv_test"
          }`;

    // Redirect if page inactive
    useEffect(() => {
        if (!pageActive) navigate("/notfound");
    }, [pageActive, navigate]);

    // Fetch CSV and compute stats
    useEffect(() => {
        const fetchCSV = async () => {
            setLoading(true);
            setErrorMsg("");

            try {
                const res = await fetch(csvURL, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                });
                if (!res.ok) {
                    const err = await res.json();
                    setErrorMsg(err.msg || "CSV fetch failed");
                    setLoading(false);
                    return;
                }

                const text = await res.text();
                Papa.parse(text, {
                    header: false,
                    skipEmptyLines: true,
                    complete: ({ data }) => {
                        const rows = data.slice(1);

                        if (mode === "train") {
                            // Parse train rows: [filename, true_label, pred_label]
                            const parsed = rows.map((r) => ({
                                file_name: r[0],
                                true_label: r[1],
                                pred_label: r[2],
                            }));

                            const total = parsed.length;
                            const correct = parsed.filter(
                                (r) => r.true_label === r.pred_label
                            ).length;
                            const incorrect = total - correct;
                            const falsePositives = parsed.filter(
                                (r) =>
                                    r.true_label === "0" && r.pred_label === "1"
                            ).length;
                            const falseNegatives = parsed.filter(
                                (r) =>
                                    r.true_label === "1" && r.pred_label === "0"
                            ).length;

                            const trueLabelCounts = parsed.reduce(
                                (acc, { true_label }) => {
                                    acc[true_label] =
                                        (acc[true_label] || 0) + 1;
                                    return acc;
                                },
                                {}
                            );

                            const predLabelCounts = parsed.reduce(
                                (acc, { pred_label }) => {
                                    acc[pred_label] =
                                        (acc[pred_label] || 0) + 1;
                                    return acc;
                                },
                                {}
                            );

                            // Compute precision, recall, F1 per label
                            const precisionByLabel = {};
                            const recallByLabel = {};
                            const f1ByLabel = {};

                            Object.keys(trueLabelCounts).forEach((label) => {
                                const tp = parsed.filter(
                                    (r) =>
                                        r.true_label === label &&
                                        r.pred_label === label
                                ).length;
                                const fp = (predLabelCounts[label] || 0) - tp;
                                const fn = (trueLabelCounts[label] || 0) - tp;

                                const precision = predLabelCounts[label]
                                    ? tp / predLabelCounts[label]
                                    : 0;
                                const recall = trueLabelCounts[label]
                                    ? tp / trueLabelCounts[label]
                                    : 0;
                                const f1 =
                                    precision + recall > 0
                                        ? (2 * precision * recall) /
                                          (precision + recall)
                                        : 0;

                                precisionByLabel[label] = parseFloat(
                                    precision.toFixed(2)
                                );
                                recallByLabel[label] = parseFloat(
                                    recall.toFixed(2)
                                );
                                f1ByLabel[label] = parseFloat(f1.toFixed(2));
                            });

                            setStats({
                                total,
                                correct,
                                incorrect,
                                falsePositives,
                                falseNegatives,
                                trueLabelCounts,
                                predLabelCounts,
                                precisionByLabel,
                                recallByLabel,
                                f1ByLabel,
                            });
                            setTableData(parsed);
                        } else {
                            // Parse test rows: [filename, pred_label]
                            const parsed = rows.map((r) => ({
                                file_name: r[0],
                                pred_label: r[1],
                            }));
                            const total = parsed.length;
                            const predLabelCounts = parsed.reduce(
                                (acc, { pred_label }) => {
                                    acc[pred_label] =
                                        (acc[pred_label] || 0) + 1;
                                    return acc;
                                },
                                {}
                            );

                            setStats((s) => ({
                                ...s,
                                total,
                                predLabelCounts,
                            }));
                            setTableData(parsed);
                        }

                        setVisibleCount(20);
                        setLoading(false);
                    },
                });
            } catch (error) {
                console.error(error);
                setErrorMsg("Network error during CSV fetch");
                setLoading(false);
            }
        };

        fetchCSV();
    }, [csvURL, mode]);

    // Download handler
    const handleDownload = () => {
        fetch(csvURL, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Download failed");
                return res.blob();
            })
            .then((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${mode}_data.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            })
            .catch((e) => setErrorMsg(e.message));
    };

    // Colour palette
    const palette = ["#36A2EB", "#FF6384", "#FFCE56", "#4BC0C0"];

    // Chart data
    const doughnutData = {
        labels: ["Correct", "Incorrect"],
        datasets: [
            {
                data: [stats.correct, stats.incorrect],
                backgroundColor: [palette[0], palette[1]],
                hoverBackgroundColor: [palette[0], palette[1]],
            },
        ],
    };

    const errorBreakdownData = {
        labels: ["False Positives", "False Negatives"],
        datasets: [
            {
                data: [stats.falsePositives, stats.falseNegatives],
                backgroundColor: [palette[2], palette[3]],
                hoverBackgroundColor: [palette[2], palette[3]],
            },
        ],
    };

    const barData = (counts, label, colorStartIndex = 0) => ({
        labels: Object.keys(counts),
        datasets: [
            {
                label,
                data: Object.values(counts),
                backgroundColor: Object.keys(counts).map(
                    (_, i) => palette[(colorStartIndex + i) % palette.length]
                ),
                borderWidth: 1,
            },
        ],
    });

    const testDoughnutData = {
        labels: Object.keys(stats.predLabelCounts),
        datasets: [
            {
                data: Object.values(stats.predLabelCounts),
                backgroundColor: Object.keys(stats.predLabelCounts).map(
                    (_, i) => palette[i % palette.length]
                ),
                hoverBackgroundColor: Object.keys(stats.predLabelCounts).map(
                    (_, i) => palette[i % palette.length]
                ),
            },
        ],
    };

    const buttonStyle = (active) => ({
        padding: "8px 16px",
        margin: "0 5px",
        border: "none",
        borderRadius: "4px",
        cursor: active ? "default" : "pointer",
        backgroundColor: active ? palette[0] : "#e0e0e0",
        color: active ? "#fff" : "#000",
    });

    return (
        <div className="stats-container">
            <Link to="/predict" className="logo-link">
                ← Back to Predict
            </Link>
            <h1>CSV File Viewer & Stats</h1>

            <div className="mode-toggle">
                <button
                    onClick={() => setMode("train")}
                    disabled={mode === "train"}
                    style={buttonStyle(mode === "train")}
                >
                    Train Stats
                </button>
                <button
                    onClick={() => setMode("test")}
                    disabled={mode === "test"}
                    style={buttonStyle(mode === "test")}
                >
                    Test Stats
                </button>
            </div>

            {loading && <p>Loading CSV data...</p>}
            {errorMsg && <div className="error-msg">{errorMsg}</div>}

            {tableData.length > 0 && (
                <>
                    <div
                        className="table-container"
                        style={{
                            maxHeight: "300px",
                            overflowY: "auto",
                            marginBottom: "2rem",
                        }}
                    >
                        <h2>
                            File Data (
                            {mode.charAt(0).toUpperCase() + mode.slice(1)})
                        </h2>
                        <table className="stats-table">
                            <thead>
                                <tr>
                                    <th>File Name</th>
                                    {mode === "train" && <th>True Label</th>}
                                    <th>Predicted Label</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableData
                                    .slice(0, visibleCount)
                                    .map((row, i) => (
                                        <tr key={i}>
                                            <td>{row.file_name}</td>
                                            {mode === "train" && (
                                                <td>{row.true_label}</td>
                                            )}
                                            <td>{row.pred_label}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                        {visibleCount < tableData.length && (
                            <div
                                style={{
                                    textAlign: "center",
                                    margin: "10px 0",
                                }}
                            >
                                <button
                                    onClick={() =>
                                        setVisibleCount((c) => c + 20)
                                    }
                                >
                                    Load More
                                </button>
                            </div>
                        )}
                    </div>
                    <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                        <button
                            onClick={handleDownload}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: palette[0],
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                            }}
                        >
                            Download CSV
                        </button>
                    </div>
                </>
            )}

            {stats.total > 0 && (
                <div className="stats-section">
                    <h2>Statistics</h2>
                    <p>Total: {stats.total}</p>

                    {mode === "train" ? (
                        <>
                            <p>
                                Correct: {stats.correct} | Incorrect:{" "}
                                {stats.incorrect}
                            </p>
                            <p>
                                Accuracy:{" "}
                                {((stats.correct / stats.total) * 100).toFixed(
                                    2
                                )}
                                %
                            </p>
                        </>
                    ) : (
                        <ul>
                            {Object.entries(stats.predLabelCounts).map(
                                ([label, count]) => (
                                    <li key={label}>
                                        {label}: {count} (
                                        {((count / stats.total) * 100).toFixed(
                                            1
                                        )}
                                        %)
                                    </li>
                                )
                            )}
                        </ul>
                    )}

                    <div
                        className="charts-grid"
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(280px, 1fr))",
                            gap: "1.5rem",
                            alignItems: "start",
                        }}
                    >
                        {mode === "train" && (
                            <>
                                <div className="chart-card">
                                    <h3>Accuracy</h3>
                                    <Doughnut data={doughnutData} />
                                </div>
                                <div className="chart-card">
                                    <h3>Error Breakdown</h3>
                                    <Doughnut data={errorBreakdownData} />
                                </div>
                                <div className="chart-card">
                                    <h3>True Label Distribution</h3>
                                    <Bar
                                        data={barData(
                                            stats.trueLabelCounts,
                                            "True Label",
                                            0
                                        )}
                                        options={{
                                            scales: {
                                                y: { beginAtZero: true },
                                            },
                                        }}
                                    />
                                </div>
                                <div className="chart-card">
                                    <h3>Predicted Label Distribution</h3>
                                    <Bar
                                        data={barData(
                                            stats.predLabelCounts,
                                            "Predicted Label",
                                            1
                                        )}
                                        options={{
                                            scales: {
                                                y: { beginAtZero: true },
                                            },
                                        }}
                                    />
                                </div>
                                <div className="chart-card">
                                    <h3>Precision by Label</h3>
                                    <Bar
                                        data={barData(
                                            stats.precisionByLabel,
                                            "Precision",
                                            2
                                        )}
                                        options={{
                                            scales: {
                                                y: {
                                                    beginAtZero: true,
                                                    max: 1,
                                                },
                                            },
                                        }}
                                    />
                                </div>
                                <div className="chart-card">
                                    <h3>Recall by Label</h3>
                                    <Bar
                                        data={barData(
                                            stats.recallByLabel,
                                            "Recall",
                                            2
                                        )}
                                        options={{
                                            scales: {
                                                y: {
                                                    beginAtZero: true,
                                                    max: 1,
                                                },
                                            },
                                        }}
                                    />
                                </div>
                                <div className="chart-card">
                                    <h3>F1 Score by Label</h3>
                                    <Bar
                                        data={barData(
                                            stats.f1ByLabel,
                                            "F1 Score",
                                            2
                                        )}
                                        options={{
                                            scales: {
                                                y: {
                                                    beginAtZero: true,
                                                    max: 1,
                                                },
                                            },
                                        }}
                                    />
                                </div>
                            </>
                        )}
                        {mode === "test" && (
                            <>
                                <div className="chart-card">
                                    <h3>Predicted Label Distribution (Bar)</h3>
                                    <Bar
                                        data={barData(
                                            stats.predLabelCounts,
                                            "Predicted Label",
                                            1
                                        )}
                                        options={{
                                            scales: {
                                                y: { beginAtZero: true },
                                            },
                                        }}
                                    />
                                </div>
                                <div className="chart-card">
                                    <h3>Predicted Label Distribution (Pie)</h3>
                                    <Doughnut data={testDoughnutData} />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Stats;
