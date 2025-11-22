import React, { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";

// Import GeocoderControl
import GeocoderControl from "./GeocoderControl"; // Assuming you put it in a separate file

// Fix for default Leaflet icon issues with Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const AddBus = () => {
  const initialBusState = {
    number: "",
    password: "", // WARNING: Should be hashed in a real app, or moved to a separate Operator schema
    name: "",
    schedule: {
      days: [],
    },
    busType: "",
    totalSeats: 0,
    perKilometerRate: 0,
    stops: [],
  };

  const [busData, setBusData] = useState(initialBusState);
  const [currentStopIndexForMap, setCurrentStopIndexForMap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const busTypes = ["sleeper", "ac", "general"];

  // Handle changes for main bus data fields
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "schedule.days") {
      setBusData((prevData) => {
        const newDays = checked
          ? [...prevData.schedule.days, value]
          : prevData.schedule.days.filter((day) => day !== value);
        return {
          ...prevData,
          schedule: {
            ...prevData.schedule,
            days: newDays,
          },
        };
      });
    } else {
      setBusData((prevData) => ({
        ...prevData,
        [name]: type === "number" ? Number(value) : value,
      }));
    }
  };

  // Handle changes for nested stop fields
  const handleStopChange = (index, e) => {
    const { name, value, type } = e.target;
    const newStops = [...busData.stops];
    newStops[index] = {
      ...newStops[index],
      [name]: type === "number" ? Number(value) : value,
    };
    setBusData((prevData) => ({
      ...prevData,
      stops: newStops,
    }));
  };

  // Add a new stop to the array
  const addStop = () => {
    setBusData((prevData) => ({
      ...prevData,
      stops: [
        ...prevData.stops,
        {
          name: "",
          latitude: null,
          longitude: null,
          distanceFromStart: null,
          arrivalTime: "",
          departureTime: "",
          halt: null,
        },
      ],
    }));
  };

  // Remove a stop from the array
  const removeStop = (index) => {
    setBusData((prevData) => {
      const updatedStops = prevData.stops.filter((_, i) => i !== index);
      // Adjust currentStopIndexForMap if the removed stop was selected or affects the index
      let newCurrentStopIndex = currentStopIndexForMap;
      if (currentStopIndexForMap === index) {
        newCurrentStopIndex = null;
      } else if (currentStopIndexForMap > index) {
        newCurrentStopIndex = currentStopIndexForMap - 1;
      }
      return {
        ...prevData,
        stops: updatedStops,
      };
    });
    if (currentStopIndexForMap === index) {
      setCurrentStopIndexForMap(null);
    } else if (currentStopIndexForMap > index) {
      setCurrentStopIndexForMap(currentStopIndexForMap - 1);
    }
  };

  // Map click handler component to get coordinates
  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        if (currentStopIndexForMap !== null) {
          const { lat, lng } = e.latlng;
          const newStops = [...busData.stops];
          newStops[currentStopIndexForMap] = {
            ...newStops[currentStopIndexForMap],
            latitude: lat,
            longitude: lng,
          };
          setBusData((prevData) => ({
            ...prevData,
            stops: newStops,
          }));
          setCurrentStopIndexForMap(null); // Reset after setting coordinates
        }
      },
    });
    return null;
  };

  // Callback for GeocoderControl
  const handleGeocoderSelect = (lat, lng, name) => {
    if (currentStopIndexForMap !== null) {
      const newStops = [...busData.stops];
      newStops[currentStopIndexForMap] = {
        ...newStops[currentStopIndexForMap],
        latitude: lat,
        longitude: lng,
        // Optionally, pre-fill the stop name if it's empty
        name: newStops[currentStopIndexForMap].name || name,
      };
      setBusData((prevData) => ({
        ...prevData,
        stops: newStops,
      }));
      setCurrentStopIndexForMap(null); // Reset after setting coordinates
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    // Basic frontend validation
    if (
      !busData.number ||
      !busData.password ||
      !busData.name ||
      busData.schedule.days.length === 0 ||
      !busData.busType ||
      busData.totalSeats <= 0 ||
      busData.perKilometerRate <= 0
    ) {
      setError(
        "Please fill in all required bus details (Bus Number, Password, Name, Schedule Days, Bus Type, Total Seats, Per Kilometer Rate)."
      );
      setLoading(false);
      return;
    }

    if (
      busData.stops.some(
        (stop) =>
          !stop.name ||
          stop.latitude === null ||
          stop.longitude === null ||
          stop.distanceFromStart === null ||
          !stop.arrivalTime ||
          !stop.departureTime
      )
    ) {
      setError(
        "Please ensure all stops have a name, map coordinates (latitude/longitude), distance from start, arrival time, and departure time."
      );
      setLoading(false);
      return;
    }

    try {
      // Make sure the URL matches your Express server's port and route prefix
      const response = await axios.post(
        "http://localhost:3000/admin/addbus",
        busData
      );
      setSuccess(response.data.message || "Bus added successfully!");
      setBusData(initialBusState); // Reset form
    } catch (err) {
      console.error(
        "Error adding bus:",
        err.response ? err.response.data : err.message
      );
      setError(
        err.response?.data?.message || "Failed to add bus. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        Add New Bus Information
      </h1>

      {loading && (
        <div
          className="p-3 mb-4 text-sm text-blue-800 rounded-lg bg-blue-50 text-center"
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
          Adding Bus...
        </div>
      )}
      {error && (
        <div
          className="p-3 mb-4 text-sm text-red-800 rounded-lg bg-red-50"
          role="alert">
          {error}
        </div>
      )}
      {success && (
        <div
          className="p-3 mb-4 text-sm text-green-800 rounded-lg bg-green-50"
          role="alert">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6">
        {/* Left Part: Leaflet Map View */}
        <div className="lg:w-1/2 p-4 border border-gray-200 rounded-lg shadow-md bg-white sticky top-4 self-start h-[90vh] overflow-auto">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Bus Stops Map
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {currentStopIndexForMap !== null
              ? `Click on the map to set coordinates for stop: ${
                  busData.stops[currentStopIndexForMap]?.name ||
                  `New Stop ${currentStopIndexForMap + 1}`
                }`
              : "Select a stop's 'Pick on Map' button or use the search bar on the map to set its coordinates."}
          </p>
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            className="h-[90%] w-full rounded-lg shadow-inner z-0" // z-0 to ensure it's behind other elements if any overlap
            scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler />
            {/* Integrate GeocoderControl here */}
            <GeocoderControl onSelectLocation={handleGeocoderSelect} />

            {busData.stops.map((stop, index) =>
              stop.latitude && stop.longitude ? (
                <Marker key={index} position={[stop.latitude, stop.longitude]}>
                  <Popup>
                    <span className="font-semibold">Stop:</span> {stop.name}
                    <br />
                    <span className="font-semibold">Lat:</span>{" "}
                    {stop.latitude?.toFixed(4)},{" "}
                    <span className="font-semibold">Lng:</span>{" "}
                    {stop.longitude?.toFixed(4)}
                  </Popup>
                </Marker>
              ) : null
            )}
          </MapContainer>
        </div>

        {/* Right Part: Form Data */}
        <div className="lg:w-1/2 p-4 border border-gray-200 rounded-lg shadow-md bg-white">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Bus Details
          </h2>

          <div className="mb-4">
            <label
              htmlFor="number"
              className="block text-sm font-medium text-gray-700 mb-1">
              Bus Number:
            </label>
            <input
              type="text"
              id="number"
              name="number"
              value={busData.number}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1">
              Operator Password:{" "}
              <span className="text-red-500 font-normal text-xs">
                (Not recommended for bus schema, move to Operator User)
              </span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={busData.password}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1">
              Bus Name:
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={busData.name}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule Days:
            </label>
            <div className="mt-1 grid grid-cols-2 md:grid-cols-3 gap-2">
              {daysOfWeek.map((day) => (
                <label
                  key={day}
                  className="inline-flex items-center text-gray-700">
                  <input
                    type="checkbox"
                    name="schedule.days"
                    value={day}
                    checked={busData.schedule.days.includes(day)}
                    onChange={handleChange}
                    className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                  />
                  <span className="ml-2 text-sm">{day}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bus Type:
            </label>
            <div className="mt-1 flex flex-wrap gap-4">
              {busTypes.map((type) => (
                <label
                  key={type}
                  className="inline-flex items-center text-gray-700">
                  <input
                    type="radio"
                    name="busType"
                    value={type}
                    checked={busData.busType === type}
                    onChange={handleChange}
                    required
                    className="form-radio h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                  />
                  <span className="ml-2 text-sm">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="totalSeats"
              className="block text-sm font-medium text-gray-700 mb-1">
              Total Seats:
            </label>
            <input
              type="number"
              id="totalSeats"
              name="totalSeats"
              value={busData.totalSeats}
              onChange={handleChange}
              required
              min="1"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="perKilometerRate"
              className="block text-sm font-medium text-gray-700 mb-1">
              Per Kilometer Rate:
            </label>
            <input
              type="number"
              id="perKilometerRate"
              name="perKilometerRate"
              value={busData.perKilometerRate}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <h3 className="text-lg font-semibold mb-3 text-gray-700">
            Bus Stops
          </h3>
          {busData.stops.map((stop, index) => (
            <div
              key={index}
              className="border border-dashed border-gray-300 p-4 mb-4 rounded-md bg-gray-50 relative">
              <h4 className="font-medium mb-3 text-gray-800">
                Stop {index + 1}
              </h4>
              <div className="mb-3">
                <label
                  htmlFor={`stopName-${index}`}
                  className="block text-sm font-medium text-gray-700 mb-1">
                  Stop Name:
                </label>
                <input
                  type="text"
                  id={`stopName-${index}`}
                  name="name"
                  value={stop.name}
                  onChange={(e) => handleStopChange(index, e)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude:
                  </label>
                  <input
                    type="number"
                    name="latitude"
                    value={stop.latitude || ""}
                    onChange={(e) => handleStopChange(index, e)}
                    readOnly
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude:
                  </label>
                  <input
                    type="number"
                    name="longitude"
                    value={stop.longitude || ""}
                    onChange={(e) => handleStopChange(index, e)}
                    readOnly
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed sm:text-sm"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStopIndexForMap(index)}
                className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                  currentStopIndexForMap === index
                    ? "bg-yellow-600"
                    : "bg-indigo-600"
                } hover:${
                  currentStopIndexForMap === index
                    ? "bg-yellow-700"
                    : "bg-indigo-700"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mb-3`}>
                {currentStopIndexForMap === index
                  ? "Click on Map..."
                  : "Pick on Map"}
              </button>

              <div className="mb-3">
                <label
                  htmlFor={`distanceFromStart-${index}`}
                  className="block text-sm font-medium text-gray-700 mb-1">
                  Distance From Start (km):
                </label>
                <input
                  type="number"
                  id={`distanceFromStart-${index}`}
                  name="distanceFromStart"
                  value={stop.distanceFromStart || ""}
                  onChange={(e) => handleStopChange(index, e)}
                  min="0"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label
                    htmlFor={`arrivalTime-${index}`}
                    className="block text-sm font-medium text-gray-700 mb-1">
                    Arrival Time:
                  </label>
                  <input
                    type="time"
                    id={`arrivalTime-${index}`}
                    name="arrivalTime"
                    value={stop.arrivalTime}
                    onChange={(e) => handleStopChange(index, e)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`departureTime-${index}`}
                    className="block text-sm font-medium text-gray-700 mb-1">
                    Departure Time:
                  </label>
                  <input
                    type="time"
                    id={`departureTime-${index}`}
                    name="departureTime"
                    value={stop.departureTime}
                    onChange={(e) => handleStopChange(index, e)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="mb-3">
                <label
                  htmlFor={`halt-${index}`}
                  className="block text-sm font-medium text-gray-700 mb-1">
                  Halt Duration (minutes):
                </label>
                <input
                  type="number"
                  id={`halt-${index}`}
                  name="halt"
                  value={stop.halt || ""}
                  onChange={(e) => handleStopChange(index, e)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeStop(index)}
                className="absolute top-2 right-2 p-1 text-red-600 hover:text-red-800 focus:outline-none"
                aria-label="Remove Stop">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addStop}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 mt-4">
            Add Stop
          </button>

          <button
            type="submit"
            className="w-full mt-6 py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={loading}>
            {loading ? "Adding Bus..." : "Add Bus"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddBus;
