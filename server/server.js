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
