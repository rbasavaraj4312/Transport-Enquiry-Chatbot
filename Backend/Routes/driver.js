const express = require("express");
const Bus = require("../Models/bus");
const router = express.Router();

router.post("/login", async (req, res) => {
  const { busnumber, password } = req.body;
  try {
    const bus = await Bus.findOne({ number: busnumber, password });
    if (bus) {
      res.status(200).json({ message: "Driver login successful!", bus });
    } else {
      res
        .status(401)
        .json({ message: "Invalid bus number or password. Please try again." });
    }
  } catch (error) {
    res.status(500).json({
      message: "An error occurred during driver login. Please try again later.",
    });
  }
});

router.put("/:busId/location", async (req, res) => {
  try {
    const { busId } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const bus = await Bus.findByIdAndUpdate(
      busId,
      {
        currentLatitude: latitude,
        currentLongitude: longitude,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      currentLocation: {
        latitude: bus.currentLatitude,
        longitude: bus.currentLongitude,
      },
    });
  } catch (error) {
    console.error("Update location error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.put("/:busId/stop/:stopIndex/reached", async (req, res) => {
  try {
    const { busId, stopIndex } = req.params;
    const { reached } = req.body;

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
      });
    }

    if (stopIndex < 0 || stopIndex >= bus.stops.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid stop index",
      });
    }

    bus.stops[stopIndex].reached = reached;
    await bus.save();

    res.status(200).json({
      success: true,
      message: "Stop status updated successfully",
      stop: bus.stops[stopIndex],
    });
  } catch (error) {
    console.error("Update stop error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/:busId/data", async (req, res) => {
  try {
    const { busId } = req.params;


    if (!busId || busId === "undefined" || busId === "null") {
      return res.status(400).json({
        success: false,
        message: "Valid bus ID is required",
      });
    }

 
    if (!busId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bus ID format",
      });
    }

    const bus = await Bus.findById(busId).select(
      "number name busType totalSeats stops schedule currentLatitude currentLongitude"
    );

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
      });
    }

    const busData = bus.toObject();
    busData.id = bus._id.toString();

    res.status(200).json({
      success: true,
      bus: busData,
    });
  } catch (error) {
    console.error("Get bus data error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/buses/locations", async (req, res) => {
  try {
    const buses = await Bus.find({
      currentLatitude: { $ne: null },
      currentLongitude: { $ne: null },
    }).select("number name currentLatitude currentLongitude busType");

    res.status(200).json({
      success: true,
      buses,
    });
  } catch (error) {
    console.error("Get buses locations error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.put("/:busId/reset-stops", async (req, res) => {
  try {
    const { busId } = req.params;

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
      });
    }

    bus.stops.forEach((stop) => {
      stop.reached = false;
    });

    await bus.save();

    res.status(200).json({
      success: true,
      message: "All stops reset successfully",
      stops: bus.stops,
    });
  } catch (error) {
    console.error("Reset stops error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;
