const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    password: { type: String, required: true },
    bookings: [
      {
        busNumber: { type: String },
        bookingDate: { type: Date },
        from: { type: String },
        to: { type: String },
        seats: { type: [Number] },
        amount: { type: Number },
        status: { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
