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

    // ============ USER ROUTES ============

    // Save or update user on login/register
    app.post("/api/users", async (req, res) => {
      try {
        const user = req.body;
        const query = { email: user.email };
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            ...user,
            lastLogin: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        };
        const result = await usersCollection.updateOne(
          query,
          updateDoc,
          options,
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // Get user by email
    app.get("/api/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const user = await usersCollection.findOne({ email });
        res.send(user || {});
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

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
