import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

const app = express();
const port = 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.listen(port, () => {
    console.log(`Server app listening on port ${process.env.PORT}`);
});

// MongoDB connection
const API_KEY = process.env.GEMINI_API_KEY;
const url = process.env.MONGODB_URI;

mongoose
    .connect(url)
    .then(() => console.log("✅ DB connected"))
    .catch((err) => console.error("❌ DB Error:", err));

// --- User Schema & Model ---
const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        phone: { type: String, required: true, unique: true },
        gender: { type: String, enum: ["Male", "Female", "Other"] },
        password: { type: String, required: true },
        bookings: [
            {
                busNumber: { type: String, required: true },
                bookingId: {
                    type: String,
                    required: true,
                    default: () => uuidv4(),
                },
                bookingDate: { type: Date, default: Date.now },
                seats: { type: [Number], required: true },
                amount: { type: Number, required: true },
                status: {
                    type: String,
                    enum: ["Confirmed", "Cancelled", "Pending"],
                    default: "Pending",
                },
            },
        ],
        chatBotHistory: [
            {
                question: { type: String },
                answer: { type: String },
                timestamp: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);

// Bus Schema & Model
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
                bookingId: { type: String, required: true },
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
                farePaid: { type: Number, required: true },
            },
        ],
    },
    { timestamps: true }
);

const ChatBus = mongoose.model("Bus", BusSchema);

// Fix existing bookings function
async function fixExistingBookings() {
    try {
        const users = await User.find({});
        for (const user of users) {
            let needsUpdate = false;
            for (const booking of user.bookings) {
                if (!booking.bookingId) {
                    booking.bookingId = uuidv4();
                    needsUpdate = true;
                }
            }
            if (needsUpdate) {
                await user.save({ validateBeforeSave: false });
                console.log(`Fixed bookings for user: ${user._id}`);
            }
        }
        console.log("All existing bookings have been fixed!");
    } catch (error) {
        console.error("Error fixing existing bookings:", error);
    }
}

fixExistingBookings();

// Google Generative AI
const genAI = new GoogleGenerativeAI(API_KEY);

// Function to create model with user context
function createModelWithUserContext(user) {
    return genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        tools: [
            {
                functionDeclarations: [
                    {
                        name: "getBusDetails",
                        description:
                            "Get details of bus routes between two locations",
                        parameters: {
                            type: "object",
                            properties: {
                                from: { type: "string" },
                                to: { type: "string" },
                            },
                            required: ["from", "to"],
                        },
                    },
                    {
                        name: "initiateBooking",
                        description:
                            "Initiate a booking for seats on a specific bus for the current user",
                        parameters: {
                            type: "object",
                            properties: {
                                busNumber: { type: "string" },
                                seatsToBook: {
                                    type: "array",
                                    items: { type: "number" },
                                },
                            },
                            required: ["busNumber", "seatsToBook"],
                        },
                    },
                    {
                        name: "getUserBookings",
                        description: "Get all bookings for the current user",
                        parameters: {
                            type: "object",
                            properties: {},
                        },
                    },
                ],
            },
        ],
        systemInstruction: `Today's date is: ${new Date().toDateString()}.

You are a polite and helpful bus enquiry and booking assistant. 

**IMPORTANT USER CONTEXT:**
- Current user: ${user.name}
- User ID: ${user._id}
- Email: ${user.email}
- Phone: ${user.phone}

**INSTRUCTIONS:**
- You are chatting with ${user.name}. Address them by name when appropriate.
- You already know who they are, so NEVER ask for their user ID or personal details.
- When they want to book seats, you can proceed directly with the booking using their authenticated account.
- Respond in a conversational manner with emojis to make the experience friendly.
- If the user asks about buses, call 'getBusDetails' with the 'from' and 'to' locations.
- Present bus details in a human-readable format including number, name, route, schedule, fare, seats, and stops.
- If the user wants to book seats, call 'initiateBooking' with the bus number and seat numbers.
- If booking is successful, provide booking ID and payment link.
- If the user asks about their bookings, call 'getUserBookings' to show their booking history.
- For non-bus related questions, respond helpfully but guide them back to bus services.

**BOOKING PROCESS:**
1. When user wants to book, simply ask for bus number and preferred seats
2. Use 'initiateBooking' function (the user ID is already known)
3. Provide booking confirmation and payment link
4. Explain that booking is pending until payment is confirmed

Remember: You're helping ${user.name} with their bus travel needs!`,
    });
}

// Store chat sessions with user context
const userChatSessions = new Map();

// Enhanced booking function
async function initiateBooking(busNumber, seatsToBook, userId) {
    try {
        const bus = await ChatBus.findOne({ number: busNumber });
        if (!bus) {
            return { success: false, message: `Bus ${busNumber} not found.` };
        }

        let userObjectId;
        let user;
        if (mongoose.Types.ObjectId.isValid(userId)) {
            userObjectId = new mongoose.Types.ObjectId(userId);
            user = await User.findById(userObjectId);
            if (!user) {
                return { success: false, message: "User not found." };
            }
        } else {
            return { success: false, message: "Invalid user ID format." };
        }

        // Check seat availability
        const currentlyBookedSeats = bus.bookings.reduce((acc, booking) => {
            if (
                booking.status === "Confirmed" ||
                booking.status === "Pending"
            ) {
                acc.push(...booking.seatNumber);
            }
            return acc;
        }, []);

        const unavailableSeats = seatsToBook.filter((seat) =>
            currentlyBookedSeats.includes(seat)
        );

        if (unavailableSeats.length > 0) {
            const allPossibleSeats = Array.from(
                { length: bus.totalSeats },
                (_, i) => i + 1
            );
            const availableSeats = allPossibleSeats.filter(
                (seat) => !currentlyBookedSeats.includes(seat)
            );

            return {
                success: false,
                message: `Seats ${unavailableSeats.join(
                    ", "
                )} are already booked. Available seats: ${
                    availableSeats.length > 0
                        ? availableSeats.join(", ")
                        : "None"
                }.`,
                availableSeats: availableSeats,
            };
        }

        // Generate booking ID and calculate fare
        const bookingId = uuidv4();
        const assumedRouteDistance = 100; // km
        const farePerSeat = bus.perKilometerRate * assumedRouteDistance;
        const totalFare = seatsToBook.length * farePerSeat;

        // Add booking to bus
        bus.bookings.push({
            bookingId: bookingId,
            userId: userObjectId,
            seatNumber: seatsToBook,
            date: new Date(),
            farePaid: totalFare,
            status: "Pending",
            bookedAt: new Date(),
        });

        // Add booking to user
        const userBooking = {
            busNumber: bus.number,
            bookingId: bookingId,
            bookingDate: new Date(),
            seats: seatsToBook,
            amount: totalFare,
            status: "Pending",
        };
        user.bookings.push(userBooking);

        // Fix existing bookings without bookingId
        user.bookings.forEach((booking) => {
            if (!booking.bookingId) {
                booking.bookingId = uuidv4();
            }
        });

        await bus.save();
        await user.save();

        return {
            success: true,
            message: `Great news ${
                user.name
            }! Booking initiated for seats ${seatsToBook.join(
                ", "
            )} on bus ${busNumber}. Booking ID: ${bookingId}. Total fare: ₹${totalFare.toFixed(
                2
            )}.`,
            bookingId,
            bookedSeats: seatsToBook,
            busNumber,
            totalFare,
            paymentLink: `/pay/${bookingId}`,
        };
    } catch (error) {
        console.error("Error initiating booking:", error);
        return {
            success: false,
            message: "An error occurred while processing your booking request.",
        };
    }
}

// Function to get user bookings
async function getUserBookings(userId) {
    try {
        const user = await User.findById(userId).populate("bookings");
        if (!user) {
            return { success: false, message: "User not found." };
        }

        if (user.bookings.length === 0) {
            return {
                success: true,
                message:
                    "You don't have any bookings yet. Would you like to search for buses?",
                bookings: [],
            };
        }

        return {
            success: true,
            bookings: user.bookings,
            message: `Here are your ${user.bookings.length} booking(s):`,
        };
    } catch (error) {
        console.error("Error fetching user bookings:", error);
        return {
            success: false,
            message: "Error retrieving your bookings.",
        };
    }
}

// Enhanced runAgent function
async function runAgent(userPrompt, userId) {
    try {
        // Get user details for context
        const user = await User.findById(userId);
        if (!user) {
            return "I'm sorry, I couldn't find your user account. Please try logging in again.";
        }

        // Get or create chat session with user context
        let chat = userChatSessions.get(userId);
        if (!chat) {
            const model = createModelWithUserContext(user);
            chat = model.startChat();
            userChatSessions.set(userId, chat);
        }

        console.log(`👤 ${user.name} (${userId}): ${userPrompt}`);
        let agentResponse = "I couldn't process your request at the moment.";

        const result = await chat.sendMessage(userPrompt);
        const functionCalls = result.response.functionCalls() || [];

        if (functionCalls.length > 0) {
            for (const functionCall of functionCalls) {
                if (functionCall.name === "getBusDetails") {
                    const args = functionCall.args || {};
                    const { from, to } = args;

                    if (!from || !to) {
                        agentResponse =
                            "Please provide both origin and destination for bus search.";
                        const followUpResult = await chat.sendMessage([
                            {
                                functionResponse: {
                                    name: "getBusDetails",
                                    response: { details: agentResponse },
                                },
                            },
                        ]);
                        agentResponse = followUpResult.response.text();
                        continue;
                    }

                    try {
                        // Option 1: Find all buses with both stops (recommended)
                        const buses = await ChatBus.find({
                            $and: [
                                { "stops.name": new RegExp(`^${from}$`, "i") },
                                { "stops.name": new RegExp(`^${to}$`, "i") },
                            ],
                        });

                        if (buses && buses.length > 0) {
                            let busDetailsText = `Found ${buses.length} bus(es) from ${from} to ${to}:\n\n`;

                            buses.forEach((bus, index) => {
                                const busObj = bus.toObject();
                                const stopNames = busObj.stops.map(
                                    (s) => s.name
                                );
                                const fromIndex = stopNames.findIndex((s) =>
                                    new RegExp(`^${from}$`, "i").test(s)
                                );
                                const toIndex = stopNames.findIndex((s) =>
                                    new RegExp(`^${to}$`, "i").test(s)
                                );

                                // Validate route order
                                if (
                                    fromIndex !== -1 &&
                                    toIndex !== -1 &&
                                    fromIndex < toIndex
                                ) {
                                    const currentlyBookedSeats =
                                        busObj.bookings.reduce(
                                            (acc, booking) => {
                                                if (
                                                    booking.status ===
                                                        "Confirmed" ||
                                                    booking.status === "Pending"
                                                ) {
                                                    acc.push(
                                                        ...booking.seatNumber
                                                    );
                                                }
                                                return acc;
                                            },
                                            []
                                        );

                                    const availableSeatCount =
                                        busObj.totalSeats -
                                        currentlyBookedSeats.length;
                                    const allPossibleSeats = Array.from(
                                        { length: bus.totalSeats },
                                        (_, i) => i + 1
                                    );
                                    const availableSeats =
                                        allPossibleSeats.filter(
                                            (seat) =>
                                                !currentlyBookedSeats.includes(
                                                    seat
                                                )
                                        );

                                    // Calculate estimated travel time and fare
                                    const fromStop = busObj.stops[fromIndex];
                                    const toStop = busObj.stops[toIndex];
                                    const distanceBetweenStops =
                                        toStop.distanceFromStart -
                                        fromStop.distanceFromStart;
                                    const fareForRoute = (
                                        busObj.perKilometerRate *
                                        distanceBetweenStops
                                    ).toFixed(2);

                                    busDetailsText += `🚌 Bus ${index + 1}:
• Number: ${busObj.number}
• Name: ${busObj.name}
• Type: ${busObj.busType.toUpperCase()}
• Schedule: ${busObj.schedule.days.join(", ")}
• Distance: ${distanceBetweenStops}km
• Estimated Fare: ₹${fareForRoute}
• Total Seats: ${busObj.totalSeats}
• Available: ${availableSeatCount} seats
• Available Seat Numbers: ${availableSeats.slice(0, 10).join(", ")}${
                                        availableSeats.length > 10 ? "..." : ""
                                    }

Journey Details:
• Departure from ${fromStop.name}: ${fromStop.departureTime}
• Arrival at ${toStop.name}: ${toStop.arrivalTime}

All Stops on Route:
${busObj.stops
    .slice(fromIndex, toIndex + 1)
    .map(
        (s, i) => `${i + 1}. ${s.name} (${s.arrivalTime} - ${s.departureTime})`
    )
    .join("\n")}

${"─".repeat(50)}

`;
                                }
                            });

                            agentResponse = busDetailsText;
                        } else {
                            agentResponse = `No buses found from ${from} to ${to}. Try different locations or check spelling.`;
                        }
                    } catch (dbError) {
                        console.error("Database error:", dbError);
                        agentResponse =
                            "Database error while searching for buses.";
                    }

                    const followUpResult = await chat.sendMessage([
                        {
                            functionResponse: {
                                name: "getBusDetails",
                                response: { details: agentResponse },
                            },
                        },
                    ]);
                    agentResponse = followUpResult.response.text();
                } else if (functionCall.name === "initiateBooking") {
                    const args = functionCall.args || {};
                    const { busNumber, seatsToBook } = args;

                    if (
                        !busNumber ||
                        !seatsToBook ||
                        seatsToBook.length === 0
                    ) {
                        agentResponse =
                            "Please provide bus number and seat numbers for booking.";
                        const followUpResult = await chat.sendMessage([
                            {
                                functionResponse: {
                                    name: "initiateBooking",
                                    response: {
                                        bookingStatus: {
                                            success: false,
                                            message: agentResponse,
                                        },
                                    },
                                },
                            },
                        ]);
                        agentResponse = followUpResult.response.text();
                        continue;
                    }

                    const bookingResult = await initiateBooking(
                        busNumber,
                        seatsToBook,
                        userId
                    );

                    const followUpResult = await chat.sendMessage([
                        {
                            functionResponse: {
                                name: "initiateBooking",
                                response: { bookingStatus: bookingResult },
                            },
                        },
                    ]);
                    agentResponse = followUpResult.response.text();
                } else if (functionCall.name === "getUserBookings") {
                    const bookingsResult = await getUserBookings(userId);

                    const followUpResult = await chat.sendMessage([
                        {
                            functionResponse: {
                                name: "getUserBookings",
                                response: { bookingsData: bookingsResult },
                            },
                        },
                    ]);
                    agentResponse = followUpResult.response.text();
                }
            }
        } else {
            const textResponse = result.response.text();
            if (textResponse) {
                agentResponse = textResponse;
            }
        }

        // Save chat history
        try {
            await User.findByIdAndUpdate(userId, {
                $push: {
                    chatBotHistory: {
                        question: userPrompt,
                        answer: agentResponse,
                        timestamp: new Date(),
                    },
                },
            });
        } catch (historyError) {
            console.error("Error saving chat history:", historyError);
        }

        return agentResponse;
    } catch (error) {
        console.error("Error in runAgent:", error);
        return "I'm sorry, I encountered an error. Please try again.";
    }
}

// Chat endpoint
app.post("/chat", async (req, res) => {
    const { userId, message } = req.body;

    if (!userId) {
        return res.status(400).json({
            reply: "User authentication required. Please log in again.",
        });
    }

    console.log(`👤 Chat request from user: ${userId}`);

    try {
        const reply = await runAgent(message, userId);
        res.status(200).json({ reply });
    } catch (err) {
        console.error("Error in /chat endpoint:", err);
        res.status(500).json({
            reply: "I'm experiencing technical difficulties. Please try again later.",
        });
    }
});

// Payment endpoint
app.get("/pay/:bookingId", async (req, res) => {
    const { bookingId } = req.params;

    try {
        const bus = await ChatBus.findOne({
            "bookings.bookingId": bookingId,
            "bookings.status": "Pending",
        });

        if (!bus) {
            return res
                .status(404)
                .send("Pending booking not found or already paid.");
        }

        const bookingIndex = bus.bookings.findIndex(
            (b) => b.bookingId === bookingId
        );
        const booking = bus.bookings[bookingIndex];

        const user = await User.findById(booking.userId);
        if (!user) {
            console.error(`User not found for booking ${bookingId}`);
        }

        // Update booking status
        booking.status = "Confirmed";
        booking.paid = true;
        booking.bookedAt = new Date();
        await bus.save();

        // Update user booking status
        if (user) {
            const userBookingIndex = user.bookings.findIndex(
                (b) => b.bookingId === bookingId
            );
            if (userBookingIndex !== -1) {
                user.bookings[userBookingIndex].status = "Confirmed";
                await user.save();
            }
        }

        res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Payment Successful</title>
          <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
              .container { background: white; border-radius: 20px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 500px; text-align: center; }
              .success-icon { font-size: 64px; color: #28a745; margin-bottom: 20px; }
              h1 { color: #28a745; margin-bottom: 20px; font-size: 2em; }
              .booking-details { background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; }
              .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
              .button { background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 12px 30px; border: none; border-radius: 25px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; margin-top: 20px; transition: all 0.3s ease; }
              .button:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,123,255,0.4); }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="success-icon">✅</div>
              <h1>Payment Successful!</h1>
              <div class="booking-details">
                  <div class="detail-row"><strong>Booking ID:</strong> <span>${bookingId}</span></div>
                  <div class="detail-row"><strong>Bus:</strong> <span>${
                      bus.number
                  }</span></div>
                  <div class="detail-row"><strong>Seats:</strong> <span>${booking.seatNumber.join(
                      ", "
                  )}</span></div>
                  <div class="detail-row"><strong>Amount:</strong> <span>₹${booking.farePaid.toFixed(
                      2
                  )}</span></div>
              </div>
              <p>Your booking has been confirmed! Have a great journey! 🚌</p>
              <a href="javascript:window.close()" class="button">Close Window</a>
          </div>
      </body>
      </html>
    `);
    } catch (error) {
        console.error("Payment processing error:", error);
        res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Payment Error</title>
          <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
              .container { background: white; border-radius: 20px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 500px; text-align: center; }
              .error-icon { font-size: 64px; color: #dc3545; margin-bottom: 20px; }
              h1 { color: #dc3545; margin-bottom: 20px; }
              .button { background: #6c757d; color: white; padding: 12px 30px; border: none; border-radius: 25px; cursor: pointer; text-decoration: none; display: inline-block; margin-top: 20px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="error-icon">❌</div>
              <h1>Payment Error</h1>
              <p>Sorry, there was an issue processing your payment. Please try again or contact support.</p>
              <a href="javascript:window.close()" class="button">Close Window</a>
          </div>
      </body>
      </html>
    `);
    }
});

// Booking fix endpoint
app.post("/fix-bookings", async (req, res) => {
    try {
        await fixExistingBookings();
        res.status(200).json({
            message: "All existing bookings have been fixed!",
        });
    } catch (error) {
        console.error("Error fixing bookings:", error);
        res.status(500).json({ error: "Failed to fix existing bookings" });
    }
});

export default app;
