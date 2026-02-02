import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://habitforge-tracker.web.app",
      "https://habitforge-tracker.firebaseapp.com",
    ],
    credentials: true,
  }),
);
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("HabitForge Server is running!");
});

// Health check
app.get("/health", (req, res) => {
  res.send({ status: "OK", timestamp: new Date() });
});

app.listen(port, () => {
  console.log(HabitForge Server running on port $port);
});
