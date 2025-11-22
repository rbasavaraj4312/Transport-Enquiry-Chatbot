import { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./Components/Home/Home";
import Bus from "./Components/Bus/Bus";
import SignUp from "./Components/Auth/SignUp";
import Login from "./Components/Auth/Login";
import Profile from "./Components/Profile/Profile";
import axios from "axios";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);

        try {
          const response = await axios.post(
            "http://localhost:3000/user/login",
            {
              email: parsedUser.email,
              password: parsedUser.password,
            }
          );

          if (response.data.user) {
            setUser(response.data.user);
          } else {
            setUser(parsedUser);
          }
        } catch (error) {
          console.error("Error verifying user:", error);
          setUser(parsedUser);
        }
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
      console.log("User saved:", user);
    }
  }, [user]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home user={user} setUser={setUser} />} />
        <Route path="/:busId" element={<Bus />} />
        <Route path="/profile" element={<Profile user={user} />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/signup" element={<SignUp setUser={setUser} />} />
      </Routes>
    </Router>
  );
}

export default App;
