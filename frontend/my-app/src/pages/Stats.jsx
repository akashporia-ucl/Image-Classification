import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

// Registering necessary chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const CsvReader = () => {
    const [tableData, setTableData] = useState([]);
    const [stats, setStats] = useState({ total: 0, correct: 0, incorrect: 0 });

    useEffect(() => {
        // Fetch the CSV file from the public directory
        fetch("/resnet_results.csv")
            .then((response) => response.text())
            .then((csvText) => {
                // Parse the CSV content
                Papa.parse(csvText, {
                    complete: (result) => {
                        const data = result.data;
                        const headers = data[0];

                        // Parse data and compute stats
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
            })
            .catch((error) => {
                console.error("Error loading CSV file:", error);
            });
    }, []);

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
        <div>
            <h1>CSV File Viewer & Stats</h1>

            {/* Table Display */}
            {tableData.length > 0 && (
                <div>
                    <h2>File Data</h2>
                    <table border="1">
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
                <div>
                    <h2>Statistics</h2>
                    <p>Total: {stats.total}</p>
                    <p>Correct Predictions: {stats.correct}</p>
                    <p>Incorrect Predictions: {stats.incorrect}</p>

                    {/* Donut Chart */}
                    <Doughnut data={getDoughnutChartData()} />
                </div>
            )}
        </div>
    );
};

export default CsvReader;
