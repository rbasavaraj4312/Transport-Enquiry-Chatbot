import React from "react";
import { Link } from "react-router-dom";
import { Bus, LogIn, LogOut, User } from "lucide-react";

const Headers = ({ user, setUser }) => {
  return (
    <div>
      <div className="mb-8 flex justify-between">
        <div className="flex justify-center items-center">
          <Bus className="mr-2 text-indigo-500 h-12 w-12" />
          <h1 className="text-3xl font-bold text-center text-gray-800">
            Travel Mate - Smart Bus Tracking and Enquiry ChatBot
          </h1>
        </div>
        <div>
          {user ? (
            <div className="flex gap-4">
              <button
                className="bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded"
                tooltip="Logout"
                onClick={() => {
                  setUser("");
                }}>
                <LogOut />
              </button>
              <Link to="/profile">
                <button
                  className="bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded"
                  tooltip="Profile">
                  <User />
                </button>
              </Link>
            </div>
          ) : (
            <Link to="/login">
              <button className="bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded">
                <LogIn />
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Headers;
