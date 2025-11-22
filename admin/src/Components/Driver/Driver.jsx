import React, { useState, useEffect, useRef, useCallback, use } from "react";
import { useParams, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";

import {
  MapPin,
  Navigation,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Settings,
  Bus,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const Driver = ({ currentBusId }) => {
  // const { busId } = useParams();

  const [busId, setBusId] = useState(currentBusId);

  const [currentLocation, setCurrentLocation] = useState(null);
  const [busData, setBusData] = useState(null);
  const [nearbyStop, setNearbyStop] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingMapScripts, setLoadingMapScripts] = useState(true);
  const [mapScriptsLoaded, setMapScriptsLoaded] = useState(false);

  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const driverMarkerRef = useRef(null);
  const routingControlRef = useRef(null);

  const API_BASE_URL = "http://localhost:3000";

  // API Functions (kept mostly the same, ensuring busId usage)
  const updateDriverLocation = useCallback(
    async (busIdToUpdate, latitude, longitude) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/${busIdToUpdate}/location`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ latitude, longitude }),
          }
        );

        const data = await response.json();
        if (!data.success) {
          console.error("Failed to update location:", data.message);
        }
        return data.success;
      } catch (error) {
        console.error("Update location error:", error);
        return false;
      }
    },
    [API_BASE_URL]
  );

  const updateStopStatus = useCallback(
    async (busIdToUpdate, stopIndex, reached = true) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/${busIdToUpdate}/stop/${stopIndex}/reached`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reached }),
          }
        );

        const data = await response.json();
        if (data.success) {
          setBusData((prevBusData) => {
            if (!prevBusData) return null;
            const updatedStops = [...prevBusData.stops];
            updatedStops[stopIndex] = { ...updatedStops[stopIndex], reached };
            return { ...prevBusData, stops: updatedStops };
          });
        } else {
          console.error("Failed to update stop status:", data.message);
        }
        return data.success;
      } catch (error) {
        console.error("Update stop error:", error);
        return false;
      }
    },
    [API_BASE_URL]
  );

  const fetchBusData = useCallback(
    async (busIdToFetch) => {
      try {
        if (
          !busIdToFetch ||
          busIdToFetch === "undefined" ||
          busIdToFetch === "null"
        ) {
          console.error(
            "Invalid busId provided for fetchBusData:",
            busIdToFetch
          );
          setError("Invalid bus ID. Cannot load route data.");
          return false;
        }

        console.log("Fetching bus data for ID:", busIdToFetch);
        const response = await fetch(`${API_BASE_URL}/${busIdToFetch}/data`);
        const data = await response.json();

        if (data.success) {
          const busDataWithId = {
            ...data.bus,
            id: data.bus._id || data.bus.id, // Ensure both _id and id are available
          };
          setBusData(busDataWithId);
          console.log("Bus data fetched successfully:", busDataWithId.number);
          setError(null); // Clear any previous errors
        } else {
          console.error("Failed to fetch bus data:", data.message);
          setError(`Failed to load bus data: ${data.message}`);
        }
        return data.success;
      } catch (error) {
        console.error("Fetch bus data error:", error);
        setError(
          "Network error or server unavailable. Could not fetch bus data."
        );
        return false;
      }
    },
    [API_BASE_URL]
  );

  const resetAllStops = useCallback(
    async (busIdToReset) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/${busIdToReset}/reset-stops`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();
        if (data.success) {
          setBusData((prev) => ({
            ...prev,
            stops: data.stops,
          }));
          setError(null);
        } else {
          console.error("Failed to reset stops:", data.message);
          setError(`Failed to reset stops: ${data.message}`);
        }
        return data.success;
      } catch (error) {
        console.error("Reset stops error:", error);
        setError("Network error or server unavailable. Could not reset stops.");
        return false;
      }
    },
    [API_BASE_URL]
  );

  // Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const checkNearbyStops = (currentLat, currentLng, stops) => {
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      // Skip if stop is already reached
      if (stop.reached) continue;

      const distance = calculateDistance(
        currentLat,
        currentLng,
        stop.latitude,
        stop.longitude
      );

      if (distance <= 50) {
        // Within 50 meters
        return { stop, index: i, distance };
      }
    }
    return null;
  };

  // Initialize map
  const initializeMap = useCallback(() => {
    if (typeof window !== "undefined" && window.L && !mapRef.current) {
      const map = window.L.map("map", { zoomControl: false }).setView(
        [12.9716, 77.5946], // Bengaluru default
        12
      );

      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      window.L.control
        .zoom({
          position: "bottomright",
        })
        .addTo(map);

      mapRef.current = map;
      return map;
    }
    return mapRef.current;
  }, []);

  // Add markers for stops
  const addStopMarkers = useCallback((map, stops) => {
    markersRef.current.forEach((marker) => map.removeLayer(marker));
    markersRef.current = [];

    stops.forEach((stop, index) => {
      const icon = window.L.divIcon({
        html: `<div class="stop-marker ${stop.reached ? "reached" : "pending"}">
                 <span class="stop-number">${index + 1}</span>
               </div>`,
        className: "custom-div-icon",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = window.L.marker([stop.latitude, stop.longitude], {
        icon,
      }).addTo(map).bindPopup(`
          <div class="stop-popup">
            <h3>${stop.name}</h3>
            <p><strong>Arrival:</strong> ${stop.arrivalTime}</p>
            <p><strong>Departure:</strong> ${stop.departureTime}</p>
            <p><strong>Status:</strong> ${
              stop.reached ? "Reached" : "Pending"
            }</p>
          </div>
        `);

      markersRef.current.push(marker);
    });
  }, []);

  // Add current location marker
  const addCurrentLocationMarker = useCallback((map, lat, lng) => {
    if (driverMarkerRef.current) {
      map.removeLayer(driverMarkerRef.current);
    }

    const icon = window.L.divIcon({
      html: '<div class="current-location-marker"><div class="pulse"></div></div>',
      className: "custom-current-location",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    driverMarkerRef.current = window.L.marker([lat, lng], { icon })
      .addTo(map)
      .bindPopup("Your Current Location");
  }, []);

  // Add routing from current location to the next unreached stop
  const addRouting = useCallback((map, currentLat, currentLng, stops) => {
    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }

    // Ensure Leaflet.Routing is loaded before attempting to use it
    if (
      !window.L.Routing ||
      !currentLat ||
      !currentLng ||
      !stops ||
      stops.length === 0
    ) {
      return;
    }

    const nextUnreachedStop = stops.find((stop) => !stop.reached);

    if (nextUnreachedStop) {
      const waypoints = [
        window.L.latLng(currentLat, currentLng),
        window.L.latLng(
          nextUnreachedStop.latitude,
          nextUnreachedStop.longitude
        ),
      ];

      routingControlRef.current = window.L.Routing.control({
        waypoints: waypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        createMarker: () => null, // Prevents Routing Machine from adding its own markers
        lineOptions: {
          styles: [{ color: "purple", weight: 6, opacity: 1 }],
        },
        show: false, // Prevents Routing Machine from showing its default UI elements
      }).addTo(map);
    }
  }, []);

  // --- Effect to load external Leaflet scripts ---
  useEffect(() => {
    const loadScripts = () => {
      // Check if Leaflet and Routing Machine are already loaded
      if (window.L && window.L.Routing) {
        setMapScriptsLoaded(true);
        setLoadingMapScripts(false);
        return;
      }

      setLoadingMapScripts(true);

      // Load Leaflet CSS
      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href =
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.css";
      document.head.appendChild(cssLink);

      // Load Leaflet JS
      const leafletScript = document.createElement("script");
      leafletScript.src =
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.js";
      leafletScript.onload = () => {
        // Load Leaflet Routing Machine CSS
        const routingCss = document.createElement("link");
        routingCss.rel = "stylesheet";
        routingCss.href =
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet-routing-machine/3.2.12/leaflet-routing-machine.css";
        document.head.appendChild(routingCss);

        // Load Leaflet Routing Machine JS
        const routingScript = document.createElement("script");
        routingScript.src =
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet-routing-machine/3.2.12/leaflet-routing-machine.min.js";
        routingScript.onload = () => {
          setMapScriptsLoaded(true);
          setLoadingMapScripts(false);
        };
        routingScript.onerror = () => {
          setError("Failed to load Leaflet Routing Machine scripts.");
          setLoadingMapScripts(false);
        };
        document.head.appendChild(routingScript);
      };
      leafletScript.onerror = () => {
        setError("Failed to load Leaflet scripts.");
        setLoadingMapScripts(false);
      };
      document.head.appendChild(leafletScript);

      // Cleanup function to remove scripts/styles if component unmounts
      return () => {
        document.head.removeChild(cssLink);
        document.head.removeChild(leafletScript);
        // Only remove routing scripts if they were added
        if (routingScript && routingScript.parentNode)
          document.head.removeChild(routingScript);
        if (routingCss && routingCss.parentNode)
          document.head.removeChild(routingCss);
      };
    };

    loadScripts();
  }, []); // Empty dependency array means this runs once on mount

  // --- Effect to fetch initial bus data ---
  useEffect(() => {
    if (busId) {
      fetchBusData(busId);
    } else {
      setError(
        "No Bus ID found. Please ensure the busId parameter is present in the URL (e.g., /driver?busId=YOUR_ID)."
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busId, fetchBusData]);

  useEffect(() => {
    let intervalId;
    let currentWatchId;

    if (mapScriptsLoaded && busData) {
      const map = initializeMap();
      if (!map) {
        setError("Map failed to initialize.");
        return;
      }

      addStopMarkers(map, busData.stops);

      // Initial map view
      if (currentLocation) {
        map.setView([currentLocation.lat, currentLocation.lng], 15);
        addCurrentLocationMarker(map, currentLocation.lat, currentLocation.lng);
        addRouting(
          map,
          currentLocation.lat,
          currentLocation.lng,
          busData.stops
        );
      } else if (busData.stops && busData.stops.length > 0) {
        // If no current location yet, center on the first stop
        map.setView(
          [busData.stops[0].latitude, busData.stops[0].longitude],
          13
        );
      } else {
        // Fallback to Bengaluru if no location or stops
        map.setView([12.9716, 77.5946], 12);
      }

      // Start location tracking
      if (navigator.geolocation) {
        currentWatchId = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const newLocation = { lat: latitude, lng: longitude };
            setCurrentLocation(newLocation);

            // Update map elements
            if (mapRef.current) {
              addCurrentLocationMarker(mapRef.current, latitude, longitude);
              addRouting(mapRef.current, latitude, longitude, busData.stops);
              mapRef.current.panTo([latitude, longitude]);
            }

            // Update backend and check nearby stops
            if (busId) {
              await updateDriverLocation(busId, latitude, longitude);
            }

            const nearby = checkNearbyStops(latitude, longitude, busData.stops);
            if (nearby) {
              setNearbyStop(nearby);
              // Only update if the stop hasn't been reached yet
              if (!nearby.stop.reached && busId) {
                const updated = await updateStopStatus(
                  busId,
                  nearby.index,
                  true
                );
                if (updated) {
                  await fetchBusData(busId); // Re-fetch to update local busData state
                }
              }
            } else {
              setNearbyStop(null);
            }
          },
          (err) => {
            console.error("Error getting location:", err);
            setError(
              "Failed to get location. Please check GPS permissions and ensure GPS is enabled."
            );
            setCurrentLocation(null); // Clear current location on error
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000,
          }
        );
        setWatchId(currentWatchId); // Store the watch ID
      } else {
        setError("Geolocation is not supported by your browser.");
      }

      // Set up interval for refreshing bus data (e.g., in case of manual stop updates by others)
      intervalId = setInterval(() => {
        if (busId) {
          fetchBusData(busId);
        }
      }, 30000); // Fetch bus data every 30 seconds
    }

    return () => {
      // Cleanup on component unmount or dependencies change
      if (currentWatchId) {
        navigator.geolocation.clearWatch(currentWatchId);
        setWatchId(null);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (mapRef.current) {
        mapRef.current.remove(); // Clean up the map instance
        mapRef.current = null;
      }
    };
  }, [
    mapScriptsLoaded,
    busData,
    initializeMap,
    addStopMarkers,
    addCurrentLocationMarker,
    addRouting,
    busId, // Add busId as dependency
    fetchBusData,
    updateDriverLocation,
    updateStopStatus,
  ]);

  return (
    <div className="flex h-screen bg-gray-100 relative overflow-hidden">
      {/* Loading overlay for scripts */}
      {loadingMapScripts && (
        <div className="absolute inset-0 bg-gray-200 bg-opacity-75 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <svg
              className="animate-spin h-10 w-10 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-3 text-lg text-gray-700">
              Loading Map Services...
            </p>
          </div>
        </div>
      )}

      {/* Collapsible Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-96" : "w-0"
        } bg-white shadow-lg transition-all duration-300 z-20 flex-shrink-0 overflow-hidden`}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bus className="h-6 w-6 text-blue-600" />
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    {busData ? `${busData.number}` : "Loading..."}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {busData ? busData.name : "Bus Name"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Bus Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">
                  {busData?.totalSeats || 0}
                </div>
                <div className="text-xs text-blue-800">Total Seats</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">
                  {busData?.stops?.filter((stop) => stop.reached).length || 0}
                </div>
                <div className="text-xs text-green-800">Reached</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-xl font-bold text-yellow-600">
                  {busData?.stops?.filter((stop) => !stop.reached).length || 0}
                </div>
                <div className="text-xs text-yellow-800">Remaining</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600 capitalize">
                  {busData?.busType || "N/A"}
                </div>
                <div className="text-xs text-purple-800">Bus Type</div>
              </div>
            </div>

            {/* Route Stops */}
            <h3 className="text-md font-semibold text-gray-800 mb-3">
              Route Stops
            </h3>
            <div className="space-y-2">
              {busData?.stops && busData.stops.length > 0 ? (
                busData.stops.map((stop, index) => (
                  <div
                    key={stop._id || index} // Use _id if available, fallback to index
                    className={`flex items-center space-x-3 p-3 rounded-lg border text-sm ${
                      stop.reached
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200"
                    }`}>
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        stop.reached
                          ? "bg-green-500 text-white"
                          : "bg-gray-300 text-gray-600"
                      }`}>
                      {stop.reached ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
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
                        {/* Assuming distanceFromStart is calculated or stored */}
                        {stop.distanceFromStart && (
                          <span>{stop.distanceFromStart.toFixed(1)} km</span>
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
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No stops defined for this route.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative">
        {/* Map Container */}
        {mapScriptsLoaded ? (
          <div id="map" className="w-full h-full relative z-0"></div>
        ) : (
          <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-600">
            <p>
              {loadingMapScripts ? "Loading map..." : "Map scripts not loaded."}
            </p>
          </div>
        )}

        {/* Floating Controls */}
        <div className="absolute top-4 left-4 right-4 z-50 space-y-3">
          {/* Header Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 pointer-events-auto">
              {/* Sidebar Toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-3 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
                title={sidebarOpen ? "Close Sidebar" : "Open Sidebar"}>
                {sidebarOpen ? (
                  <ChevronLeft className="h-5 w-5 text-gray-700" />
                ) : (
                  <Menu className="h-5 w-5 text-gray-700" />
                )}
              </button>

              {/* Bus Info (when sidebar closed) */}
              {!sidebarOpen && busData && (
                <div className="bg-white rounded-lg shadow-md p-3 flex items-center space-x-3">
                  <Bus className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-sm font-semibold text-gray-800">
                      {busData.number}
                    </div>
                    <div className="text-xs text-gray-600">{busData.name}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 pointer-events-auto">
              {/* GPS Status */}
              <div
                className={`px-3 py-2 rounded-lg shadow-md text-sm font-medium ${
                  currentLocation
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}>
                {currentLocation ? "GPS On" : "GPS Off"}
              </div>

              {/* Reset Stops */}
              {busData && (
                <button
                  onClick={() => {
                    if (busId) {
                      resetAllStops(busId);
                    }
                  }}
                  className="p-2 bg-yellow-500 text-white rounded-lg shadow-md hover:bg-yellow-600 transition-colors"
                  title="Reset all stops">
                  <RefreshCw className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow-md pointer-events-auto">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Nearby Stop Alert */}
          {nearbyStop && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-md pointer-events-auto">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-yellow-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Approaching {nearbyStop.stop.name}
                  </p>
                  <p className="text-sm text-yellow-700">
                    Distance: {Math.round(nearbyStop.distance)}m away
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        .stop-marker {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          z-index: 600; /* Ensure markers are above tile layers */
        }

        .stop-marker.pending {
          background-color: #f59e0b; /* Amber */
          border: 2px solid #d97706;
        }

        .stop-marker.reached {
          background-color: #10b981; /* Emerald */
          border: 2px solid #059669;
        }

        .current-location-marker {
          width: 24px;
          height: 24px;
          background-color: #3b82f6; /* Blue */
          border-radius: 50%;
          position: relative;
          border: 2px solid white;
          box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
          z-index: 650; /* Ensure driver marker is above stop markers */
        }

        .pulse {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-color: #3b82f6;
          animation: pulse 2s infinite cubic-bezier(0.66, 0, 0, 1);
          opacity: 0.7;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.7;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }

        .stop-popup {
          min-width: 200px;
        }

        .stop-popup h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: bold;
          color: #333;
        }

        .stop-popup p {
          margin: 4px 0;
          font-size: 14px;
          color: #555;
        }

        /* Hide the default routing machine UI */
        .leaflet-control-container .leaflet-routing-container {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default Driver;
