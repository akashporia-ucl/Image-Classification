import React, { useEffect, useState, createContext, useRef } from "react";
import io from "socket.io-client";

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
    // Initialize state from localStorage if available, otherwise use default values.
    const [message, setMessage] = useState(() => {
        const storedMessage = localStorage.getItem("message");
        return storedMessage ? JSON.parse(storedMessage) : "";
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
        // Initialise the socket connection and assign it to the ref.
        socketRef.current = io(baseURL);
        const socket = socketRef.current;

        // Event listener for socket connection.
        socket.on("connect", () => {
            console.log("Socket connected with id:", socket.id);
        });

        // Event listener for disconnection.
        socket.on("disconnect", () => {
            console.log("Socket disconnected");
        });

        // Event listener for a message from RabbitMQ (initial message).
        socket.on("rabbitmq_message", (msg) => {
            console.log("Received message from RabbitMQ:", msg);
            setMessage(msg);
            setButtonEnabled(true);
            setPageActive(true);
        });

        // Event listener for an update message from RabbitMQ.
        socket.on("update_message", (msg) => {
            console.log("Received update message:", msg);
            setMessage(msg);
        });

        // Cleanup the socket event listeners when the component unmounts.
        return () => {
            socket.off("connect");
            socket.off("disconnect");
            socket.off("rabbitmq_message");
            socket.off("update_message");
            socket.disconnect();
        };
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
