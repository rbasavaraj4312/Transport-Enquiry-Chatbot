import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const Admin = () => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState(""); // For Bus Number & Bus Name
  const [busTypeFilter, setBusTypeFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("all");
  const [maxRateFilter, setMaxRateFilter] = useState("");
  const [fromStopFilter, setFromStopFilter] = useState(""); // New filter state
  const [toStopFilter, setToStopFilter] = useState(""); // New filter state

  const fullDaysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const shortDaysOfWeek = {
    Monday: "M",
    Tuesday: "T",
    Wednesday: "W",
    Thursday: "Th", // Using Th to distinguish from Tuesday
    Friday: "F",
    Saturday: "S",
    Sunday: "Su", // Using Su to distinguish from Saturday
  };
  const busTypes = ["all", "sleeper", "ac", "general"];

  // Function to fetch buses from the backend
  const fetchBuses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        searchQuery,
        busType: busTypeFilter,
        day: dayFilter,
        maxRate: maxRateFilter,
        fromStop: fromStopFilter, // Include new filters
        toStop: toStopFilter, // Include new filters
      };

      // Filter out empty or 'all' values from params
      Object.keys(params).forEach((key) => {
        if (!params[key] || params[key] === "all") {
          delete params[key];
        }
      });

      const response = await axios.get("http://localhost:3000/bus/buses", {
        params,
      });
      setBuses(response.data);
    } catch (err) {
      console.error("Error fetching buses:", err);
      setError(
        err.response?.data?.message ||
          "Failed to fetch buses. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [
    searchQuery,
    busTypeFilter,
    dayFilter,
    maxRateFilter,
    fromStopFilter, // Add to dependency array
    toStopFilter, // Add to dependency array
  ]);

  // Fetch buses whenever filter states change
  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  // Helper function to format schedule days (e.g., "M T W Th F S Su")
  const formatScheduleDays = (scheduledDays) => {
    return (
      <span className="font-mono text-xs">
        {fullDaysOfWeek
          .map((day) =>
            scheduledDays.includes(day) ? (
              <span key={day} className="text-blue-600 font-semibold">
                {shortDaysOfWeek[day]}
              </span>
            ) : (
              <span key={day} className="text-gray-400">
                {shortDaysOfWeek[day]}
              </span>
            )
          )
          .reduce((prev, curr) => [prev, " ", curr])}{" "}
      </span>
    );
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setBusTypeFilter("all");
    setDayFilter("all");
    setMaxRateFilter("");
    setFromStopFilter(""); // Clear new filters
    setToStopFilter(""); // Clear new filters
  };

  return (
    <div className="container mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        Admin - Bus List
      </h1>

      {/* Filters and Search Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Input (Bus Number / Bus Name) */}
          <div>
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700 mb-1">
              Bus No. / Name:
            </label>
            <input
              type="text"
              id="search"
              placeholder="Bus number or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* From Stop Filter */}
          <div>
            <label
              htmlFor="fromStop"
              className="block text-sm font-medium text-gray-700 mb-1">
              From Stop:
            </label>
            <input
              type="text"
              id="fromStop"
              placeholder="Starting stop name..."
              value={fromStopFilter}
              onChange={(e) => setFromStopFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* To Stop Filter */}
          <div>
            <label
              htmlFor="toStop"
              className="block text-sm font-medium text-gray-700 mb-1">
              To Stop:
            </label>
            <input
              type="text"
              id="toStop"
              placeholder="Destination stop name..."
              value={toStopFilter}
              onChange={(e) => setToStopFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* Bus Type Filter */}
          <div>
            <label
              htmlFor="busType"
              className="block text-sm font-medium text-gray-700 mb-1">
              Bus Type:
            </label>
            <select
              id="busType"
              value={busTypeFilter}
              onChange={(e) => setBusTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              {busTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "all"
                    ? "All Types"
                    : type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Day Filter */}
          <div>
            <label
              htmlFor="day"
              className="block text-sm font-medium text-gray-700 mb-1">
              Schedule Day:
            </label>
            <select
              id="day"
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              <option value="all">All Days</option>
              {fullDaysOfWeek.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          {/* Max Rate Filter */}
          <div>
            <label
              htmlFor="maxRate"
              className="block text-sm font-medium text-gray-700 mb-1">
              Max Rate (per km):
            </label>
            <input
              type="number"
              id="maxRate"
              placeholder="e.g., 3.0"
              step="0.01"
              value={maxRateFilter}
              onChange={(e) => setMaxRateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-end justify-end">
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-sm w-full">
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bus List Display */}
      {loading && (
        <div
          className="p-4 mb-4 text-sm text-blue-800 rounded-lg bg-blue-50 text-center"
          role="status">
          <svg
            aria-hidden="true"
            className="inline w-5 h-5 me-2 text-blue-600 animate-spin fill-blue-600"
            viewBox="0 0 100 101"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path
              d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
              fill="currentColor"
            />
            <path
              d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367544 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9113 29.1776 86.7327 32.2275 88.1789 35.8745C89.0844 38.2154 91.5497 39.5249 93.9676 39.0409Z"
              fill="currentFill"
            />
          </svg>
          Loading buses...
        </div>
      )}
      {error && (
        <div
          className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50"
          role="alert">
          {error}
        </div>
      )}

      {!loading && buses.length === 0 && !error && (
        <div className="p-4 text-sm text-gray-800 rounded-lg bg-gray-100 text-center">
          No buses found matching your criteria.
        </div>
      )}

      {/* Bus List Table/Cards - Changed to a list format */}
      <div className="space-y-4">
        {buses.map((bus) => {
          // Derived values for "From" and "To"
          const fromStop = bus.stops.length > 0 ? bus.stops[0] : null;
          const toStop =
            bus.stops.length > 0 ? bus.stops[bus.stops.length - 1] : null;
          const fromName = fromStop ? fromStop.name : "N/A";
          const toName = toStop ? toStop.name : "N/A";

          // Total distance is the distanceFromStart of the last stop
          const totalDistance =
            toStop && typeof toStop.distanceFromStart === "number"
              ? toStop.distanceFromStart
              : 0;

          // Total cost calculation
          const totalCost = bus.perKilometerRate * totalDistance;

          return (
            <Link to={`/admin/${bus._id}`} key={bus._id}>
              <div
                key={bus._id}
                className="bg-white p-4 md:p-6 rounded-lg shadow-md border border-gray-200 flex items-center justify-between min-h-[100px] w-full my-5">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2">
                  {/* Bus Number & Name */}
                  <div className="col-span-1">
                    <p className="text-xs font-medium text-gray-500">
                      Bus Number / Name
                    </p>
                    <p className="text-lg font-bold text-blue-700">
                      {bus.number} - {bus.name}
                    </p>
                  </div>

                  {/* From & To */}
                  <div className="col-span-1">
                    <p className="text-xs font-medium text-gray-500">Route</p>
                    <p className="text-base text-gray-800 font-semibold">
                      {fromName}{" "}
                      <span className="text-gray-500 text-sm">to</span> {toName}
                    </p>
                  </div>

                  {/* Total Cost */}
                  <div className="col-span-1">
                    <p className="text-xs font-medium text-gray-500">
                      Total Cost
                    </p>
                    <p className="text-base font-semibold text-green-600">
                      ₹{totalCost.toFixed(2)}
                    </p>
                  </div>

                  {/* Schedule Days */}
                  <div className="col-span-1">
                    <p className="text-xs font-medium text-gray-500">
                      Days Available
                    </p>
                    <p className="text-base">
                      {formatScheduleDays(bus.schedule.days)}
                    </p>
                  </div>
                </div>
                {/* Optional: Action buttons (e.g., Edit, Delete) for each bus */}
                {/* <div className="ml-4 flex-shrink-0 flex flex-col space-y-2">
                <button className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm">Edit</button>
                <button className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm">Delete</button>
              </div> */}
              </div>
            </Link>
          );
        })}
      </div>
      {/* Floating Action Button for Add Bus */}
      <Link
        to="/addbus"
        className="fixed bottom-10 right-10 flex items-center justify-center h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors duration-200 text-3xl font-bold">
        +
      </Link>
    </div>
  );
};

export default Admin;
