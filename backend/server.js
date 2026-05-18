require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const adminRoutes = require("./routes/admin");
const publicRoutes = require("./routes/public");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.use("/admin", adminRoutes);
app.use("/", publicRoutes);

app.use((error, req, res, next) => {
  console.error(error);
  return res.status(500).json({ error: "Internal Server Error" });
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed", error);
    process.exit(1);
  }
}

startServer();
