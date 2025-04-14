import React, { useEffect, useState, createContext, useRef } from "react";
import io from "socket.io-client";

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
    const [message, setMessage] = useState("");
    const [buttonEnabled, setButtonEnabled] = useState(false);
    const [pageActive, setPageActive] = useState(false);

    // Determine the base URL from environment variables
    const baseURL =
        process.env.REACT_APP_USERNAME != null
            ? `https://flask-${process.env.REACT_APP_USERNAME}.comp0235.condenser.arc.ucl.ac.uk/`
            : "http://localhost:3500/";

    // Use a ref to store the socket so it does not get re-created on every render.
    const socketRef = useRef(null);

    useEffect(() => {
        // Initialise the socket connection and assign it to the ref
        socketRef.current = io(baseURL);
        const socket = socketRef.current;

        // Event listener for socket connection
        socket.on("connect", () => {
            console.log("Socket connected with id:", socket.id);
        });

        // Event listener for disconnection
        socket.on("disconnect", () => {
            console.log("Socket disconnected");
        });

        // Event listener for a message from RabbitMQ (initial)
        socket.on("rabbitmq_message", (msg) => {
            console.log("Received message from RabbitMQ:", msg);
            setMessage(msg);
            setButtonEnabled(true);
            setPageActive(true);
        });

        // Event listener for a message update from RabbitMQ
        socket.on("update_message", (msg) => {
            console.log("Received update message:", msg);
            setMessage(msg);
        });

        // Cleanup function when the component unmounts
        return () => {
            socket.off("connect");
            socket.off("disconnect");
            socket.off("rabbitmq_message");
            socket.off("update_message");
            socket.disconnect(); // close the connection
        };
    }, [baseURL]); // Run only when the baseURL changes

    // Provide the socket and other state values via context if needed by children
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
