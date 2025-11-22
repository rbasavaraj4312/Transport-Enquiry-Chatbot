const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
require("dotenv").config();

const PORT = process.env.PORT | 3002;

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const adminRoutes = require("./Routes/admin");
const busRoutes = require("./Routes/bus");
const driverRoutes = require("./Routes/driver");
const userRoutes = require("./Routes/user");

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("DB Connected");
        server.listen(PORT, () => {
            console.log(`Server is running on port : ${PORT}`);
        });
    })
    .catch((err) => console.log(`DB Connection Error: ${err}`));

app.use("/admin", adminRoutes);
app.use("/bus", busRoutes);
app.use("/", driverRoutes);
app.use("/user", userRoutes);
