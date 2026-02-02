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

    // ============ HABIT ROUTES ============

    // Create a new habit
    app.post("/api/habits", async (req, res) => {
      try {
        const habit = req.body;
        habit.createdAt = new Date();
        habit.currentStreak = 0;
        habit.longestStreak = 0;
        habit.completionHistory = [];
        habit.isPublic = habit.isPublic !== false;

        const result = await habitsCollection.insertOne(habit);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // Get all public habits (for Browse Public Habits page)
    app.get("/api/habits/public", async (req, res) => {
      try {
        const { search, category, sort } = req.query;
        let query = { isPublic: true };

        // Search by title
        if (search) {
          query.title = { $regex: search, $options: "i" };
        }

        // Filter by category
        if (category && category !== "all") {
          query.category = category;
        }

        // Sort options
        let sortOption = { createdAt: -1 };
        if (sort === "oldest") sortOption = { createdAt: 1 };
        if (sort === "streak") sortOption = { currentStreak: -1 };
        if (sort === "title") sortOption = { title: 1 };

        const habits = await habitsCollection
          .find(query)
          .sort(sortOption)
          .toArray();
        res.send(habits);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // Get featured habits (6 newest public habits)
    app.get("/api/habits/featured", async (req, res) => {
      try {
        const habits = await habitsCollection
          .find({ isPublic: true })
          .sort({ createdAt: -1 })
          .limit(6)
          .toArray();
        res.send(habits);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // Get habits by user email (for My Habits page)
    app.get("/api/habits/user/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const habits = await habitsCollection
          .find({ userEmail: email })
          .sort({ createdAt: -1 })
          .toArray();
        res.send(habits);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // Get single habit by ID
    app.get("/api/habits/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const habit = await habitsCollection.findOne({ _id: new ObjectId(id) });
        if (!habit) {
          return res.status(404).send({ error: "Habit not found" });
        }
        res.send(habit);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // Update habit
    app.put("/api/habits/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedHabit = req.body;
        delete updatedHabit._id; // Remove _id from update
        updatedHabit.updatedAt = new Date();

        const result = await habitsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedHabit },
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // Delete habit
    app.delete("/api/habits/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await habitsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
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
