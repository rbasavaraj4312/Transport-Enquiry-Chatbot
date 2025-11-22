// GeocoderControl.js (or directly in AddBus.js if you prefer)
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import "leaflet-control-geocoder/dist/Control.Geocoder.css";
import L from "leaflet";
import "leaflet-control-geocoder";

const GeocoderControl = ({ onSelectLocation }) => {
  const map = useMap();

  useEffect(() => {
    // Initialize Nominatim geocoder
    const geocoder = L.Control.Geocoder.nominatim();

    const control = L.Control.geocoder({
      query: "",
      placeholder: "Search location...",
      defaultMarkGeocode: false, // We will handle marking results if needed
      geocoder,
    })
      .on("markgeocode", function (e) {
        const { center, name } = e.geocode;
        // Pan and zoom the map to the selected location
        map.fitBounds(e.geocode.bbox);

        // Call the callback function provided by the parent component
        if (onSelectLocation) {
          onSelectLocation(center.lat, center.lng, name);
        }
      })
      .addTo(map);

    return () => {
      map.removeControl(control);
    };
  }, [map, onSelectLocation]); // Dependency array includes map and onSelectLocation

  return null;
};

export default GeocoderControl;
