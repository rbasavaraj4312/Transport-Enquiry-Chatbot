const mongoose = require("mongoose");

const BusSchema = new mongoose.Schema(
  {
    number: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    name: { type: String, unique: true, required: true },
    currentLatitude: { type: Number, default: null },
    currentLongitude: { type: Number, default: null },
    schedule: {
      days: {
        type: [String],
        required: true,
        enum: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
      },
    },
    busType: {
      type: String,
      required: true,
      enum: ["sleeper", "ac", "general"],
    },
    totalSeats: { type: Number, required: true },
    perKilometerRate: { type: Number, required: true },
    stops: [
      {
        name: String, 
        latitude: Number,
        longitude: Number,
        distanceFromStart: Number,
        arrivalTime: String,
        departureTime: String,
        halt: Number,
        reached: { type: Boolean, default: false },
      },
    ],
    bookings: [
      {
        bookingId: String,
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        seatNumber: [Number],
        date: Date,
        paid: { type: Boolean, default: false },
        status: {
          type: String,
          enum: ["Confirmed", "Cancelled", "Pending"],
          default: "Pending",
        },
        bookedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bus", BusSchema);
