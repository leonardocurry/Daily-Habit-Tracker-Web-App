import { useEffect, useMemo, useState } from "react";
import { celebrationImage } from "./config";

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

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function App() {
  const [habits, setHabits] = useState(initialHabits);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [currentDateKey, setCurrentDateKey] = useState(getLocalDateKey);
  const completedCount = habits.filter((habit) => habit.complete).length;
  const progress = (completedCount / habits.length) * 100;
  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric"
      }).format(new Date()),
    [currentDateKey]
  );

  function resetHabits() {
    setHabits((currentHabits) =>
      currentHabits.map((habit) => ({ ...habit, complete: false }))
    );
    setIsCelebrationOpen(false);
  }

  useEffect(() => {
    function moveToCurrentDay() {
      const latestDateKey = getLocalDateKey();

      if (currentDateKey !== latestDateKey) {
        resetHabits();
        setCurrentDateKey(latestDateKey);
      }
    }

    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );
    const midnightTimer = window.setTimeout(
      moveToCurrentDay,
      nextMidnight.getTime() - now.getTime() + 100
    );

    document.addEventListener("visibilitychange", moveToCurrentDay);
    window.addEventListener("focus", moveToCurrentDay);

    return () => {
      window.clearTimeout(midnightTimer);
      document.removeEventListener("visibilitychange", moveToCurrentDay);
      window.removeEventListener("focus", moveToCurrentDay);
    };
  }, [currentDateKey]);

  useEffect(() => {
    if (completedCount === habits.length) {
      setIsCelebrationOpen(true);
    }
  }, [completedCount, habits.length]);

  useEffect(() => {
    if (!isCelebrationOpen) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape") setIsCelebrationOpen(false);
    }

    document.addEventListener("keydown", handleEscape);
    document.body.classList.add("modal-open");

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.classList.remove("modal-open");
    };
  }, [isCelebrationOpen]);

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
            <div className="tracker-actions">
              <time className="tracker-date">{formattedDate}</time>
              <button
                type="button"
                className="reset-habits-button"
                onClick={resetHabits}
                disabled={completedCount === 0}
              >
                Reset
              </button>
            </div>
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

      {isCelebrationOpen && (
        <div
          className="modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsCelebrationOpen(false);
          }}
        >
          <section
            className="celebration-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="celebration-title"
            aria-describedby="celebration-message"
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Close celebration"
              onClick={() => setIsCelebrationOpen(false)}
              autoFocus
            >
              ×
            </button>
            <img
              className="celebration-image"
              src={celebrationImage.path}
              alt={celebrationImage.alt}
            />
            <div className="celebration-content">
              <p className="celebration-kicker">10 out of 10</p>
              <h2 id="celebration-title">You completed every habit!</h2>
              <p id="celebration-message">
                Here's a naked picture of Sabrina Carpenter to celebrate your win.
              </p>
              <button
                type="button"
                className="celebration-button"
                onClick={() => setIsCelebrationOpen(false)}
              >
                Celebrate the win
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
