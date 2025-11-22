const express = require("express");
const User = require("../Models/user");
const Bus = require("../Models/bus");
const jwt = require("jsonwebtoken");
const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ email: user.email }, "secretKey");
    res.status(200).json({ message: "Login successful", token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/signup", async (req, res) => {
  try {
    const { email, name, gender, phone, password } = req.body;

    if (!email || !name || !gender || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = new User({ name, email, password, gender, phone });
    await user.save();

    res.status(201).json({
      message: "User registered successfully",
      user: { email, name, gender, phone },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:busId", async (req, res) => {
  const id = req.params.busId;
  try {
    const bus = await Bus.findById(id).populate(
      "bookings.userId",
      "name phone email"
    );
    if (!bus) {
      return res.status(404).send({ message: "Bus not found" });
    }
    res.status(200).send(bus);
  } catch (error) {
    res.status(500).send({ message: "Error getting bus details", error });
  }
});

module.exports = router;
