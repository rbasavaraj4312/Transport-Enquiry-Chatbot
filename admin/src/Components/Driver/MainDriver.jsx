import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";
import {
  Bus,
  Menu,
  X,
  ChevronLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

const API_BASE_URL = "http://localhost:3000";

const Driver = ({ currentBusId }) => { 
  const [busId] = useState(currentBusId);
  const [busData, setBusData] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nearbyStop, setNearbyStop] = useState(null);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const mapRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const routingControlRef = useRef(null);

  // API Calls
  const fetchBusData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/${busId}/data`);
      const data = await res.json();
      if (data.success) setBusData(data.bus);
      else setError("Failed to fetch bus data");
    } catch {
      setError("Network error fetching bus data");
    }
  };

  const updateDriverLocation = async (lat, lng) => {
    await fetch(`${API_BASE_URL}/${busId}/location`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng }),
    });
  };

  const updateStopStatus = async (i) => {
    await fetch(`${API_BASE_URL}/${busId}/stop/${i}/reached`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reached: true }),
    });
    fetchBusData();
  };

  const resetAllStops = async () => {
    await fetch(`${API_BASE_URL}/${busId}/reset-stops`, { method: "PUT" });
    fetchBusData();
  };

  // Helpers
  const distance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180,
      φ2 = (lat2 * Math.PI) / 180;
    const dφ = ((lat2 - lat1) * Math.PI) / 180,
      dλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const checkNearbyStops = (lat, lng, stops) =>
    stops.find(
      (s, i) => !s.reached && distance(lat, lng, s.latitude, s.longitude) < 50
    )
      ? stops.findIndex((s) => !s.reached)
      : null;

  const addRouting = (map, lat, lng, stops) => {
    if (routingControlRef.current) map.removeControl(routingControlRef.current);
    const nextStop = stops.find((s) => !s.reached);
    if (!nextStop) return;
    routingControlRef.current = L.Routing.control({
      waypoints: [
        L.latLng(lat, lng),
        L.latLng(nextStop.latitude, nextStop.longitude),
      ],
      addWaypoints: false,
      createMarker: () => null,
      lineOptions: { styles: [{ color: "purple", weight: 6 }] },
    }).addTo(map);
  };

  // Effects
  useEffect(() => {
    fetchBusData();
  }, [busId]);

  useEffect(() => {
    if (!busData) return;
    const map = L.map("map").setView([12.97, 77.59], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
      map
    );
    mapRef.current = map;

    busData.stops.forEach((s, i) => {
      L.marker([s.latitude, s.longitude])
        .addTo(map)
        .bindPopup(`${i + 1}. ${s.name}`);
    });

    if (navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        if (driverMarkerRef.current) map.removeLayer(driverMarkerRef.current);
        driverMarkerRef.current = L.marker([latitude, longitude]).addTo(map);
        addRouting(map, latitude, longitude, busData.stops);
        await updateDriverLocation(latitude, longitude);

        const i = checkNearbyStops(latitude, longitude, busData.stops);
        if (i !== null) updateStopStatus(i);
      });
      return () => navigator.geolocation.clearWatch(id);
    }
  }, [busData]);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-80 bg-white shadow-lg p-4">
          <div className="flex justify-between items-center">
            <h2>{busData?.number || "Bus"}</h2>
            <button onClick={() => setSidebarOpen(false)}>
              <X />
            </button>
          </div>
          <button
            onClick={resetAllStops}
            className="mt-2 flex items-center gap-2">
            <RefreshCw /> Reset Stops
          </button>
          <h3 className="mt-4">Stops</h3>
          {busData?.stops?.map((s, i) => (
            <div
              key={i}
              className={`p-2 ${s.reached ? "bg-green-100" : "bg-gray-100"}`}>
              <span>{s.reached ? <CheckCircle /> : i + 1}</span> {s.name}
              {s.arrivalTime && (
                <span className="ml-2 flex items-center text-xs">
                  <Clock className="w-3 h-3 mr-1" /> {s.arrivalTime}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        <div id="map" className="w-full h-full"></div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-4 left-4 bg-white p-2 shadow rounded">
          {sidebarOpen ? <ChevronLeft /> : <Menu />}
        </button>
        {error && (
          <div className="absolute bottom-4 left-4 bg-red-100 text-red-700 p-2 rounded shadow flex items-center">
            <AlertCircle className="mr-2" /> {error}
          </div>
        )}
        {nearbyStop && (
          <div className="absolute bottom-16 left-4 bg-yellow-100 p-2 rounded shadow">
            Approaching {busData.stops[nearbyStop].name}
          </div>
        )}
      </div>
    </div>
  );
};

export default Driver;
