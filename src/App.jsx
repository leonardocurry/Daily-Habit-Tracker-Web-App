import { useMemo, useState } from "react";

const initialHabits = [
  { id: 1, name: "8 Hours of Sleep", complete: false },
  { id: 2, name: "Brush Teeth + Floss", complete: false },
  { id: 3, name: "Eat Vegetables", complete: false },
  { id: 4, name: "10K Steps", complete: false },
  { id: 5, name: "Skin Care Routine", complete: false },
  { id: 6, name: "No Masturbation", complete: false },
  { id: 7, name: "No Alcohol/Weed", complete: false },
  { id: 8, name: "Read for 30 minutes", complete: false },
  { id: 9, name: "Drink 8 Glasses of Water", complete: false },
  { id: 10, name: "Exercise", complete: false }
];

export default function App() {
  const [habits, setHabits] = useState(initialHabits);
  const completedCount = habits.filter((habit) => habit.complete).length;
  const progress = (completedCount / habits.length) * 100;
  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric"
      }).format(new Date()),
    []
  );

  function toggleHabit(id) {
    setHabits((currentHabits) =>
      currentHabits.map((habit) =>
        habit.id === id ? { ...habit, complete: !habit.complete } : habit
      )
    );
  }

  return (
    <div className="app-shell">
      <main className="container">
        <section className="hero" aria-labelledby="page-title">
          <div className="habit-mark" aria-hidden="true">
            <span>✓</span>
          </div>
          <p className="eyebrow">Small steps. Lasting change.</p>
          <h1 id="page-title">Daily Habit Tracker</h1>
          <p className="hero-copy">
            Build better routines, stay consistent, and celebrate your progress
            one day at a time.
          </p>
        </section>

        <section className="tracker" aria-labelledby="tracker-title">
          <div className="tracker-header">
            <div>
              <p className="tracker-kicker">Today's habits</p>
              <h2 id="tracker-title">Your daily ten</h2>
            </div>
            <time className="tracker-date">{formattedDate}</time>
          </div>

          <div className="daily-progress">
            <div className="progress-header">
              <span className="progress-label">Daily progress</span>
              <span className="progress-count">
                {completedCount} of {habits.length} complete
              </span>
            </div>
            <div
              className="progress-bar"
              role="progressbar"
              aria-label="Daily habit progress"
              aria-valuemin="0"
              aria-valuemax={habits.length}
              aria-valuenow={completedCount}
            >
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            {completedCount === habits.length && (
              <p className="progress-celebration">All ten complete — great work!</p>
            )}
          </div>

          <div className="habit-grid">
            {habits.map((habit) => (
              <article
                className={`habit-card${habit.complete ? " is-complete" : ""}`}
                key={habit.id}
              >
                <div className="habit-card-topline">
                  <span className="habit-number">
                    {String(habit.id).padStart(2, "0")}
                  </span>
                  <span className="habit-status">
                    {habit.complete ? "Completed" : "Not completed"}
                  </span>
                </div>
                <h3>{habit.name}</h3>
                <button
                  type="button"
                  className="habit-toggle"
                  aria-pressed={habit.complete}
                  onClick={() => toggleHabit(habit.id)}
                >
                  <span aria-hidden="true">{habit.complete ? "✓" : "○"}</span>
                  {habit.complete ? "Done for today" : "Mark as complete"}
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>Rodrigo Williams Curry @ 2026</p>
      </footer>
    </div>
  );
}
