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

// MongoDB Connection with caching for serverless
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  const db = client.db("habitforge");

  cachedClient = client;
  cachedDb = db;

  console.log("Connected to MongoDB!");
  return { client, db };
}

// ============ ROOT ROUTES ============

// Root route
app.get("/", (req, res) => {
  res.send("HabitForge Server is running!");
});

// Health check
app.get("/health", (req, res) => {
  res.send({ status: "OK", timestamp: new Date() });
});

// ============ USER ROUTES ============

// Save or update user on login/register
app.post("/api/users", async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");

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
    const result = await usersCollection.updateOne(query, updateDoc, options);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Get user by email
app.get("/api/users/:email", async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");

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
    const { db } = await connectToDatabase();
    const habitsCollection = db.collection("habits");

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
    const { db } = await connectToDatabase();
    const habitsCollection = db.collection("habits");

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
    const { db } = await connectToDatabase();
    const habitsCollection = db.collection("habits");

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
    const { db } = await connectToDatabase();
    const habitsCollection = db.collection("habits");

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
    const { db } = await connectToDatabase();
    const habitsCollection = db.collection("habits");

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
    const { db } = await connectToDatabase();
    const habitsCollection = db.collection("habits");

    const id = req.params.id;
    const updatedHabit = req.body;
    delete updatedHabit._id;
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
    const { db } = await connectToDatabase();
    const habitsCollection = db.collection("habits");

    const id = req.params.id;
    const result = await habitsCollection.deleteOne({
      _id: new ObjectId(id),
    });
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Mark habit as complete
app.patch("/api/habits/:id/complete", async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const habitsCollection = db.collection("habits");

    const id = req.params.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const habit = await habitsCollection.findOne({ _id: new ObjectId(id) });
    if (!habit) {
      return res.status(404).send({ error: "Habit not found" });
    }

    const completionDates = habit.completionHistory.map(
      (date) => new Date(date).toISOString().split("T")[0],
    );

    if (completionDates.includes(todayStr)) {
      return res.status(400).send({ error: "Habit already completed today" });
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    let newStreak = habit.currentStreak || 0;

    if (completionDates.includes(yesterdayStr)) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    const longestStreak = Math.max(newStreak, habit.longestStreak || 0);

    const result = await habitsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { completionHistory: new Date() },
        $set: {
          currentStreak: newStreak,
          longestStreak: longestStreak,
          lastCompleted: new Date(),
        },
      },
    );

    res.send({
      ...result,
      currentStreak: newStreak,
      longestStreak: longestStreak,
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Get habit statistics
app.get("/api/habits/:id/stats", async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const habitsCollection = db.collection("habits");

    const id = req.params.id;
    const habit = await habitsCollection.findOne({ _id: new ObjectId(id) });

    if (!habit) {
      return res.status(404).send({ error: "Habit not found" });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const completionsLast30 = habit.completionHistory.filter(
      (date) => new Date(date) >= thirtyDaysAgo,
    ).length;

    const completionPercentage = Math.round((completionsLast30 / 30) * 100);

    res.send({
      currentStreak: habit.currentStreak || 0,
      longestStreak: habit.longestStreak || 0,
      totalCompletions: habit.completionHistory.length,
      completionsLast30Days: completionsLast30,
      completionPercentage: completionPercentage,
      lastCompleted: habit.lastCompleted,
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// ============ STATS ROUTES ============

// Get user stats
app.get("/api/stats/:email", async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const habitsCollection = db.collection("habits");

    const email = req.params.email;
    const habits = await habitsCollection.find({ userEmail: email }).toArray();

    const totalHabits = habits.length;
    const totalCompletions = habits.reduce(
      (sum, h) => sum + (h.completionHistory?.length || 0),
      0,
    );
    const currentStreaks = habits.reduce(
      (sum, h) => sum + (h.currentStreak || 0),
      0,
    );
    const longestStreak = Math.max(
      ...habits.map((h) => h.longestStreak || 0),
      0,
    );

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyCompletions = habits.reduce((sum, h) => {
      const recent = (h.completionHistory || []).filter(
        (date) => new Date(date) >= weekAgo,
      );
      return sum + recent.length;
    }, 0);

    res.send({
      totalHabits,
      totalCompletions,
      currentStreaks,
      longestStreak,
      weeklyCompletions,
      averageStreak:
        totalHabits > 0 ? Math.round(currentStreaks / totalHabits) : 0,
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Start server for local development
if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`HabitForge Server running on port ${port}`);
  });
}

// Export for Vercel
export default app;
