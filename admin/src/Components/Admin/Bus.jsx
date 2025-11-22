import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";
import { Bus, ArrowLeft, X, Clock, CheckCircle } from "lucide-react";

const BusPage = () => {
  const { busId } = useParams();
  const navigate = useNavigate();
  const [busData, setBusData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const mapRef = useRef(null);
  const busMarkerRef = useRef(null);
  const routingRef = useRef(null);

  // Fetch bus details (single function for reuse)
  const fetchBus = async () => {
    try {
      const res = await fetch(`http://localhost:3000/user/${busId}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Error fetching bus:", err);
      return null;
    }
  };

  // Initialize map once
  useEffect(() => {
    const initMap = async () => {
      const data = await fetchBus();
      if (!data) return;
      setBusData(data);

      const map = L.map("map").setView(
        [data.currentLatitude, data.currentLongitude],
        12
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      // Stop markers (static)
      data.stops.forEach((stop, i) => {
        L.marker([stop.latitude, stop.longitude], {
          icon: L.divIcon({
            className: "custom-marker",
            html: `<div class="flex items-center justify-center w-8 h-8 rounded-full ${
              stop.reached ? "bg-green-600" : "bg-orange-500"
            } text-white font-bold shadow">${i + 1}</div>`,
          }),
        })
          .addTo(map)
          .bindPopup(
            `<b>${stop.name}</b><br/>Arrival: ${stop.arrivalTime}<br/>Departure: ${stop.departureTime}`
          );
      });

      // Routing to next stop
      const nextStopIndex = data.stops.findIndex((s) => !s.reached);
      if (nextStopIndex !== -1) {
        const nextStop = data.stops[nextStopIndex];
        routingRef.current = L.Routing.control({
          waypoints: [
            L.latLng(data.currentLatitude, data.currentLongitude),
            L.latLng(nextStop.latitude, nextStop.longitude),
          ],
          addWaypoints: false,
          draggableWaypoints: false,
          routeWhileDragging: false,
          createMarker: () => null,
          lineOptions: {
            styles: [{ color: "#2563eb", weight: 6, opacity: 0.9 }],
          },
        }).addTo(map);
      }

      // Bus marker
      busMarkerRef.current = L.marker(
        [data.currentLatitude, data.currentLongitude],
        {
          icon: L.divIcon({
            className: "custom-marker",
            html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white shadow font-bold">🚌</div>`,
          }),
        }
      )
        .addTo(map)
        .bindPopup(`<b>Bus: ${data.name}</b>`);

      mapRef.current = map;
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, [busId]);

  // Periodic updates (every 3s)
  useEffect(() => {
    if (!mapRef.current) return;

    const interval = setInterval(async () => {
      const updatedData = await fetchBus();
      if (!updatedData) return;

      setBusData(updatedData); // update sidebar info

      const { currentLatitude, currentLongitude } = updatedData;

      // Move bus marker
      if (busMarkerRef.current) {
        busMarkerRef.current.setLatLng([currentLatitude, currentLongitude]);
      }

      // Update routing if next stop changed
      const nextStopIndex = updatedData.stops.findIndex((s) => !s.reached);
      if (nextStopIndex !== -1) {
        const nextStop = updatedData.stops[nextStopIndex];

        if (routingRef.current) {
          mapRef.current.removeControl(routingRef.current);
        }

        routingRef.current = L.Routing.control({
          waypoints: [
            L.latLng(currentLatitude, currentLongitude),
            L.latLng(nextStop.latitude, nextStop.longitude),
          ],
          addWaypoints: false,
          draggableWaypoints: false,
          routeWhileDragging: false,
          createMarker: () => null,
          lineOptions: {
            styles: [{ color: "#2563eb", weight: 6, opacity: 0.9 }],
          },
        }).addTo(mapRef.current);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [busId]);

  if (!busData) {
    return (
      <p className="text-center text-gray-500 mt-10 text-lg animate-pulse">
        Loading bus details...
      </p>
    );
  }

  return (
    <div className="flex h-screen relative bg-gray-100">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="absolute md:relative z-20 h-full w-80 bg-white shadow-xl border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <Bus className="w-6 h-6 text-blue-600" />
              <h1 className="text-lg font-bold">{busData.number}</h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-600 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">
                  {busData.totalSeats}
                </div>
                <div className="text-xs text-blue-800">Total Seats</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">
                  {busData.stops.filter((s) => s.reached).length}
                </div>
                <div className="text-xs text-green-800">Stops Reached</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-xl font-bold text-yellow-600">
                  {busData.stops.filter((s) => !s.reached).length}
                </div>
                <div className="text-xs text-yellow-800">Stops Remaining</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600 capitalize">
                  {busData.busType}
                </div>
                <div className="text-xs text-purple-800">Bus Type</div>
              </div>
            </div>

            {/* Stops */}
            <h3 className="text-md font-semibold text-gray-800 mb-3">
              Route Stops
            </h3>
            <div className="space-y-2">
              {busData.stops.map((stop, i) => (
                <div
                  key={i}
                  className={`flex items-center space-x-3 p-3 rounded-lg border text-sm ${
                    stop.reached
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  }`}>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      stop.reached
                        ? "bg-green-500 text-white"
                        : "bg-gray-300 text-gray-600"
                    }`}>
                    {stop.reached ? <CheckCircle className="h-4 w-4" /> : i + 1}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-medium text-gray-800 truncate">
                      {stop.name}
                    </h4>
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      {stop.arrivalTime && (
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {stop.arrivalTime}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      stop.reached
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}>
                    {stop.reached ? "Reached" : "Pending"}
                  </div>
                </div>
              ))}
            </div>
            {/* Bookings */}
            <h3 className="text-md font-semibold text-gray-800 mt-6 mb-3">
              Bookings
            </h3>
            <div className="space-y-2">
              {busData.bookings && busData.bookings.length > 0 ? (
                busData.bookings.map((booking, i) => (
                  <div
                    key={i}
                    className="p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          User: {booking.userId?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Email: {booking.userId?.email || "N/A"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Phone: {booking.userId?.phone || "N/A"}
                        </p>
                      </div>
                      <div
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          booking.status === "Confirmed"
                            ? "bg-green-100 text-green-800"
                            : booking.status === "Cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                        {booking.status}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                      <p>Seats: {booking.seatNumber.join(", ")}</p>
                      <p>Date: {new Date(booking.date).toLocaleDateString()}</p>
                      <p>Paid: {booking.paid ? "✅ Yes" : "❌ No"}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No bookings yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute top-5 left-15 z-[1000] bg-blue-600 text-white px-3 py-2 rounded-md shadow hover:bg-blue-700 flex items-center space-x-2">
          <Bus className="w-4 h-4" />
          <span>Details</span>
        </button>
      )}

      {/* Map */}
      <div id="map" className="flex-1 h-full"></div>
    </div>
  );
};

export default BusPage;
