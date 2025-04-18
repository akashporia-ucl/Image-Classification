import React, { useEffect, useState, createContext, useRef } from "react";
import io from "socket.io-client";

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
    // Initialize state from localStorage if available, otherwise use default values.
    const [message, setMessage] = useState(() => {
        const storedMessage = localStorage.getItem("message");
        return storedMessage
            ? JSON.parse(storedMessage)
            : "Waiting for Model training to complete...";
    });

    const [buttonEnabled, setButtonEnabled] = useState(() => {
        return localStorage.getItem("buttonEnabled") === "true";
    });

    const [pageActive, setPageActive] = useState(() => {
        return localStorage.getItem("pageActive") === "true";
    });

    // Determine the base URL from environment variables
    const baseURL =
        process.env.REACT_APP_USERNAME != null
            ? `https://flask-${process.env.REACT_APP_USERNAME}.comp0235.condenser.arc.ucl.ac.uk/`
            : "http://localhost:3500/";

    // Use a ref to store the socket so it does not get re-created on every render.
    const socketRef = useRef(null);

    useEffect(() => {
        const initialise = async () => {
            // 1) Fetch last state from server if localStorage is empty
            if (!localStorage.getItem("message")) {
                try {
                    const response = await fetch(`${baseURL}state`);
                    if (!response.ok)
                        throw new Error(`HTTP ${response.status}`);
                    const { message, buttonEnabled, pageActive } =
                        await response.json();
                    setMessage(message);
                    setButtonEnabled(buttonEnabled);
                    setPageActive(pageActive);
                } catch (err) {
                    console.error("Could not fetch last state:", err);
                }
            }

            // 2) Then open your WebSocket
            socketRef.current = io(baseURL);
            const socket = socketRef.current;

            socket.on("connect", () => {
                console.log("Socket connected with id:", socket.id);
            });
            socket.on("disconnect", () => {
                console.log("Socket disconnected");
            });
            socket.on("rabbitmq_message", (msg) => {
                console.log("Received message from RabbitMQ:", msg);
                setMessage(msg.message);
                setButtonEnabled(true);
                setPageActive(true);
            });
            socket.on("update_message", (msg) => {
                console.log("Received update message:", msg);
                setMessage(msg.message);
            });

            // cleanup
            return () => {
                socket.off("connect");
                socket.off("disconnect");
                socket.off("rabbitmq_message");
                socket.off("update_message");
                socket.disconnect();
            };
        };

        initialise();
        console.log(message);
        console.log(buttonEnabled);
        console.log(pageActive);
    }, [baseURL]);

    // Keep localStorage in sync whenever the relevant state changes.
    useEffect(() => {
        localStorage.setItem("message", JSON.stringify(message));
        localStorage.setItem("buttonEnabled", buttonEnabled ? "true" : "false");
        localStorage.setItem("pageActive", pageActive ? "true" : "false");
    }, [message, buttonEnabled, pageActive]);

    // Provide the socket and updated state values via context to children components.
    return (
        <WebSocketContext.Provider
            value={{
                socket: socketRef.current,
                message,
                buttonEnabled,
                pageActive,
            }}
        >
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    const context = React.useContext(WebSocketContext);
    if (!context) {
        throw new Error("useWebSocket must be used within a WebSocketProvider");
    }
    return context;
};
