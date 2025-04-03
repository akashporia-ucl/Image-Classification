import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Predict from "./pages/Predict";
import ProtectedRoute from "./component/ProtectedRoute";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

function App() {
    return (
        <Router>
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
                <Route path="/" element={<Landing />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Router>
    );
}

export default App;
