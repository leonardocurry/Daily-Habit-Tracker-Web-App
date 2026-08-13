import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const databasePath = path.join(projectRoot, "data", "habits.db");
const port = Number(process.env.PORT) || 3001;

const initialHabitNames = [
  "8 Hours of Sleep",
  "Brush Teeth + Floss",
  "Eat Vegetables",
  "10K Steps",
  "Skin Care Routine",
  "No Masturbation",
  "No Alcohol/Weed",
  "Read for 30 minutes",
  "Drink 8 Glasses of Water",
  "Exercise"
];

const database = new Database(databasePath);
database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");
database.exec(`
  CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    position INTEGER NOT NULL UNIQUE,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS habit_completions (
    habit_id INTEGER NOT NULL,
    completion_date TEXT NOT NULL,
    completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (habit_id, completion_date),
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS completion_date_index
    ON habit_completions(completion_date);
`);

const seedHabit = database.prepare(`
  INSERT OR IGNORE INTO habits (id, name, position)
  VALUES (?, ?, ?)
`);
const seedHabits = database.transaction(() => {
  initialHabitNames.forEach((name, index) => seedHabit.run(index + 1, name, index + 1));
});
seedHabits();

const selectHabitsForDate = database.prepare(`
  SELECT
    habits.id,
    habits.name,
    CASE WHEN habit_completions.habit_id IS NULL THEN 0 ELSE 1 END AS complete
  FROM habits
  LEFT JOIN habit_completions
    ON habit_completions.habit_id = habits.id
    AND habit_completions.completion_date = ?
  WHERE habits.active = 1
  ORDER BY habits.position
`);
const selectHabit = database.prepare("SELECT id FROM habits WHERE id = ? AND active = 1");
const completeHabit = database.prepare(`
  INSERT OR IGNORE INTO habit_completions (habit_id, completion_date)
  VALUES (?, ?)
`);
const uncompleteHabit = database.prepare(`
  DELETE FROM habit_completions WHERE habit_id = ? AND completion_date = ?
`);
const resetDate = database.prepare("DELETE FROM habit_completions WHERE completion_date = ?");
const selectCompletionDates = database.prepare(`
  SELECT completion_date
  FROM habit_completions
  WHERE habit_id = ? AND completion_date <= ?
  ORDER BY completion_date
`);
const selectPerfectDates = database.prepare(`
  SELECT habit_completions.completion_date
  FROM habit_completions
  JOIN habits ON habits.id = habit_completions.habit_id
  WHERE habits.active = 1 AND habit_completions.completion_date <= ?
  GROUP BY habit_completions.completion_date
  HAVING COUNT(DISTINCT habit_completions.habit_id) = (
    SELECT COUNT(*) FROM habits WHERE active = 1
  )
  ORDER BY habit_completions.completion_date
`);
const selectHistoryCompletions = database.prepare(`
  SELECT habit_completions.habit_id, habit_completions.completion_date
  FROM habit_completions
  JOIN habits ON habits.id = habit_completions.habit_id
  WHERE habits.active = 1
    AND habit_completions.completion_date BETWEEN ? AND ?
  ORDER BY habit_completions.completion_date, habits.position
`);
const selectActiveHabits = database.prepare(`
  SELECT id, name FROM habits WHERE active = 1 ORDER BY position
`);

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function parseDate(request, response) {
  const { date } = request.query;
  if (!isValidDate(date)) {
    response.status(400).json({ error: "A valid date in YYYY-MM-DD format is required." });
    return null;
  }
  return date;
}

function shiftDate(date, days) {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

function calculateStreaks(completionDates, currentDate) {
  if (!completionDates.length) return { current: 0, longest: 0 };

  const completed = new Set(completionDates);
  let current = 0;
  let cursor = completed.has(currentDate) ? currentDate : shiftDate(currentDate, -1);
  while (completed.has(cursor)) {
    current += 1;
    cursor = shiftDate(cursor, -1);
  }

  let longest = 0;
  let running = 0;
  let previousDate = null;
  for (const completionDate of completionDates) {
    running = previousDate && shiftDate(previousDate, 1) === completionDate ? running + 1 : 1;
    longest = Math.max(longest, running);
    previousDate = completionDate;
  }

  return { current, longest };
}

const app = express();
app.use(express.json());

app.get("/api/habits", (request, response) => {
  const date = parseDate(request, response);
  if (!date) return;
  response.json(selectHabitsForDate.all(date).map((habit) => ({ ...habit, complete: Boolean(habit.complete) })));
});

app.put("/api/habits/:id/completion", (request, response) => {
  const date = parseDate(request, response);
  if (!date) return;

  const id = Number(request.params.id);
  if (!Number.isInteger(id) || !selectHabit.get(id)) {
    response.status(404).json({ error: "Habit not found." });
    return;
  }
  if (typeof request.body.complete !== "boolean") {
    response.status(400).json({ error: "The complete field must be a boolean." });
    return;
  }

  if (request.body.complete) completeHabit.run(id, date);
  else uncompleteHabit.run(id, date);
  response.json({ id, date, complete: request.body.complete });
});

app.delete("/api/completions", (request, response) => {
  const date = parseDate(request, response);
  if (!date) return;
  const result = resetDate.run(date);
  response.json({ date, resetCount: result.changes });
});

app.get("/api/metrics/streaks", (request, response) => {
  const date = parseDate(request, response);
  if (!date) return;

  const habitId = Number(request.query.habitId);
  if (!Number.isInteger(habitId) || !selectHabit.get(habitId)) {
    response.status(404).json({ error: "Habit not found." });
    return;
  }

  const completionDates = selectCompletionDates
    .all(habitId, date)
    .map((row) => row.completion_date);
  response.json({ habitId, date, ...calculateStreaks(completionDates, date) });
});

app.get("/api/metrics/perfect-days", (request, response) => {
  const date = parseDate(request, response);
  if (!date) return;

  const monthKey = date.slice(0, 7);
  const perfectDates = selectPerfectDates.all(date).map((row) => row.completion_date);
  response.json({
    date,
    thisMonth: perfectDates.filter((perfectDate) => perfectDate.startsWith(monthKey)).length,
    allTime: perfectDates.length
  });
});

app.get("/api/metrics/history", (request, response) => {
  const date = parseDate(request, response);
  if (!date) return;

  const dates = Array.from({ length: 7 }, (_, index) => shiftDate(date, index - 6));
  const completionKeys = new Set(
    selectHistoryCompletions
      .all(dates[0], date)
      .map((row) => `${row.habit_id}:${row.completion_date}`)
  );
  const habits = selectActiveHabits.all().map((habit) => ({
    ...habit,
    completions: dates.map((historyDate) =>
      completionKeys.has(`${habit.id}:${historyDate}`)
    )
  }));

  response.json({ startDate: dates[0], endDate: date, dates, habits });
});

app.use(express.static(path.join(projectRoot, "dist")));
app.get("/{*path}", (request, response) => {
  response.sendFile(path.join(projectRoot, "dist", "index.html"));
});

app.use((error, request, response, next) => {
  console.error(error);
  response.status(500).json({ error: "The server could not complete the request." });
});

const server = app.listen(port, () => {
  console.log(`Habit tracker server running at http://localhost:${port}`);
});

function shutDown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
