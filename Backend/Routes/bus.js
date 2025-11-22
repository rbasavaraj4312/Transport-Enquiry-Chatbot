const Bus = require("../Models/bus");
const express = require("express");
const router = express.Router();

router.get("/buses", async (req, res) => {
  try {
    const { searchQuery, busType, day, maxRate, fromStop, toStop } = req.query;
    const findQuery = {}; 
    if (searchQuery) {
      findQuery.$or = [
        { number: { $regex: searchQuery, $options: "i" } }, 
        { name: { $regex: searchQuery, $options: "i" } },
      ];
    }
    if (busType && busType !== "all") {
      findQuery.busType = busType;
    }
    if (day && day !== "all") {
      findQuery["schedule.days"] = day;
    }
    if (maxRate) {
      findQuery.perKilometerRate = { $lte: parseFloat(maxRate) }; 
    }

    if (fromStop) {
      findQuery["stops.0.name"] = { $regex: new RegExp(fromStop, "i") };
    }

    
    if (toStop) {
      if (!findQuery.$and) {
        findQuery.$and = [];
      }
      findQuery.$and.push({
        $expr: {
          $regexMatch: {
            input: {
              $arrayElemAt: [
                "$stops.name",
                { $subtract: [{ $size: "$stops" }, 1] },
              ],
            },
            regex: new RegExp(toStop, "i"), 
          },
        },
      });
    }

    const buses = await Bus.find(findQuery);
    res.status(200).json(buses);
  } catch (err) {
    console.error("Error fetching buses:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch buses. Please try again." });
  }
});

module.exports = router;
