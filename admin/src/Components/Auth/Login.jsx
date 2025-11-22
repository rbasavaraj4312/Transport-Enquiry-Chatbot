import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";

const Login = ({ setloged, setBusId }) => {
  const navigate = useNavigate();

  const [isDriverLogin, setIsDriverLogin] = useState(true);

  const [busNumber, setBusNumber] = useState("");
  const [driverPassword, setDriverPassword] = useState("");

  const [adminDetails, setAdminDetails] = useState({
    email: "",
    password: "",
  });

  const handleAdminChange = (e) => {
    const { name, value } = e.target;
    setAdminDetails({
      ...adminDetails,
      [name]: value,
    });
  };

  const handleDriverSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:3000/login", {
        busnumber: busNumber,
        password: driverPassword,
      });

      if (response.status === 200) {
        setloged(true);
        setBusId(response.data.bus._id);
        alert("Driver login successful!");
        navigate(`/${response.data.bus._id}`);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        alert("Invalid bus number or password. Please try again.");
      } else {
        alert("An error occurred during driver login. Please try again later.");
        console.error("Driver login error:", error);
      }
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:3000/admin/login", {
        ...adminDetails,
      });
      alert(response.data.message);
      setAdminDetails({ email: "", password: "" });
      setloged(true);
      navigate("/admin");
    } catch (error) {
      console.error(
        "Error during admin login:",
        error.response?.data?.message || error.message
      );
      alert(error.response?.data?.message || "Admin login failed.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8 sm:p-10 lg:p-12 w-full max-w-md mx-4">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
            Welcome Back!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Login in to your account.
          </p>
        </div>

        <div className="mb-8 flex justify-center">
          <button
            onClick={() => setIsDriverLogin(true)}
            className={`px-6 py-2 rounded-l-lg text-sm font-medium transition-all duration-300
              ${
                isDriverLogin
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}>
            Driver Login
          </button>
          <button
            onClick={() => setIsDriverLogin(false)}
            className={`px-6 py-2 rounded-r-lg text-sm font-medium transition-all duration-300
              ${
                !isDriverLogin
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}>
            Admin Login
          </button>
        </div>

        {isDriverLogin ? (
          <form onSubmit={handleDriverSubmit} className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-4">
              Driver Portal
            </h3>
            <div className="relative z-0 w-full group">
              <input
                type="text"
                name="busNumber"
                id="driverBusNumber"
                value={busNumber}
                onChange={(e) => setBusNumber(e.target.value)}
                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                placeholder=" "
                required
              />
              <label
                htmlFor="driverBusNumber"
                className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                Enter Bus Number
              </label>
            </div>
            <div className="relative z-0 w-full group">
              <input
                type="password"
                name="driverPassword"
                id="driverPassword"
                value={driverPassword}
                onChange={(e) => setDriverPassword(e.target.value)}
                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                placeholder=" "
                required
              />
              <label
                htmlFor="driverPassword"
                className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                Enter Password
              </label>
            </div>
            <button
              type="submit"
              className="w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
              Login as Driver
            </button>
          </form>
        ) : (
          <form onSubmit={handleAdminSubmit} className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-4">
              Admin Portal
            </h3>
            <div className="relative z-0 w-full group">
              <input
                type="email"
                name="email"
                id="adminEmail"
                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                placeholder=" "
                required
                value={adminDetails.email}
                onChange={handleAdminChange}
              />
              <label
                htmlFor="adminEmail"
                className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                Email address
              </label>
            </div>
            <div className="relative z-0 w-full group">
              <input
                type="password"
                name="password"
                id="adminPassword"
                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                placeholder=" "
                required
                value={adminDetails.password}
                onChange={handleAdminChange}
              />
              <label
                htmlFor="adminPassword"
                className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                Password
              </label>
            </div>
            <button
              type="submit"
              className="w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
              Login as Admin
            </button>
            {/* You can re-add the "Create an new account" link here if needed */}
            {/* <hr className="my-6 border-gray-200 dark:border-gray-700" />
            <NavLink
              to="/signup"
              className="text-sm text-center block font-medium text-blue-600 hover:underline dark:text-blue-500">
              Create a new account
            </NavLink> */}
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
