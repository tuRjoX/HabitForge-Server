import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

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

// MongoDB Connection
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    const database = client.db("habitforge");
    const habitsCollection = database.collection("habits");
    const usersCollection = database.collection("users");

    // Root route
    app.get("/", (req, res) => {
      res.send("HabitForge Server is running!");
    });

    // Health check
    app.get("/health", (req, res) => {
      res.send({ status: "OK", timestamp: new Date() });
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`HabitForge Server running on port ${port}`);
});
