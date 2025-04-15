import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Predict from "./pages/Predict";
import ProtectedRoute from "./component/ProtectedRoute";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import LearnMore from "./pages/LearnMore";
import Stats from "./pages/Stats"; // Ensure Stats is imported
import { WebSocketProvider } from "./component/WebSocketProvider";

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
                path="/predict"
                element={
                    <ProtectedRoute>
                        <Predict />
                    </ProtectedRoute>
                }
            />
            <Route path="/learn-more" element={<LearnMore />} />
            <Route
                path="/stats"
                element={
                    <ProtectedRoute>
                        <Stats />
                    </ProtectedRoute>
                }
            />
            <Route path="/" element={<Landing />} />
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

function App() {
    return (
        <WebSocketProvider>
            <Router>
                <AppRoutes />
            </Router>
        </WebSocketProvider>
    );
}

export default App;
