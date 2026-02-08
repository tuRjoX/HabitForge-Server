# HabitForge Server

Backend API server for HabitForge - Daily Habit Tracker application.

# Live Link

**[Sever Link](https://habit-forge-server.vercel.app)**


## Setup

1. Clone the repository
2. Run `npm install`
3. Create a `.env` file based on `.env.example`
4. Run `npm run dev` for development or `npm start` for production

## API Endpoints

### Users

- `POST /api/users` - Create/update user
- `GET /api/users/:email` - Get user by email

### Habits

- `POST /api/habits` - Create new habit
- `GET /api/habits/public` - Get all public habits (with search/filter)
- `GET /api/habits/featured` - Get 6 newest public habits
- `GET /api/habits/user/:email` - Get user's habits
- `GET /api/habits/:id` - Get single habit
- `PUT /api/habits/:id` - Update habit
- `DELETE /api/habits/:id` - Delete habit
- `PATCH /api/habits/:id/complete` - Mark habit complete

### Stats

- `GET /api/stats/:email` - Get user statistics

## Technologies

- Node.js
- Express.js
- MongoDB
- Firebase Admin SDK (optional)
