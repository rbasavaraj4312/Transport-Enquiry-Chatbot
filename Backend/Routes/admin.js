const Admin = require("../Models/admin");
const Bus = require("../Models/bus");
const express = require("express");
const router = express.Router();

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const admin = new Admin({ name, email, password });
    await admin.save();

    res.status(201).json({ message: "Admin created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error creating admin", error });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (admin.password !== password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.status(200).json({ message: "Admin login successful!" });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Admin login failed." });
  }
});

router.post("/addbus", async (req, res) => {
  try {
    const busData = req.body;

    const newBus = new Bus(busData);

    await newBus.save();

    res.status(201).json({
      message: "Bus added successfully!",
      bus: newBus.toObject({ getters: true, versionKey: false }),
    });
  } catch (error) {
    console.error("Error adding bus:", error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({
        message: `A bus with this ${field} already exists.`,
        error: error.message,
      });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        message: "Validation error: Please check your input.",
        errors: errors,
        error: error.message,
      });
    }

    res.status(500).json({
      message: "Server error: Failed to add bus.",
      error: error.message,
    });
  }
});

module.exports = router;
