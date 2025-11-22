import { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import Login from "./Components/Auth/Login";
import Signup from "./Components/Auth/Signup";
import Admin from "./Components/Admin/Admin";
import AddBus from "./Components/Admin/AddBus";
import Driver from "./Components/Driver/Driver";
import BusPage from "./Components/Admin/Bus";

function App() {
  const [user, setuser] = useState("");
  const [useloged, setloged] = useState(false);
  const [busId, setBusId] = useState("");
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={<Login setloged={setloged} setBusId={setBusId} />}
        />

        {/* This only to add admin */}
        <Route path="/signup" element={<Signup />} />

        {/* admin routes  */}
        <Route path="/addbus" element={<AddBus />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/:busId" element={<BusPage />} />

        {/* driver routes  */}
        <Route path="/:busnumber" element={<Driver currentBusId={busId} />} />
      </Routes>
    </Router>
  );
}

export default App;
