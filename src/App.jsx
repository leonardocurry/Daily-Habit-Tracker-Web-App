import { useEffect, useMemo, useState } from "react";
import { celebrationImage } from "./config";

const STREAK_HABIT_ID = 6;

// Replace each URL and icon filename with your social media details.
// SVG icon files belong in the public/icons folder.
const socialLinks = [
  { name: "Instagram", url: "https://www.instagram.com/leonardocurry/", icon: "/icons/instagram.svg" },
  { name: "X", url: "https://x.com/LeonardoCurry", icon: "/icons/x.svg" },
  { name: "Github", url: "https://github.com/leonardocurry", icon: "/icons/github.svg" }
];

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Something went wrong. Please try again.");
  }
  return response.json();
}

export default function App() {
  const [habits, setHabits] = useState([]);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [currentDateKey, setCurrentDateKey] = useState(getLocalDateKey);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingHabitIds, setPendingHabitIds] = useState([]);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState("");
  const [streaks, setStreaks] = useState({ current: 0, longest: 0 });
  const [isStreakLoading, setIsStreakLoading] = useState(true);
  const [perfectDays, setPerfectDays] = useState({ thisMonth: 0, allTime: 0 });
  const [isPerfectDaysLoading, setIsPerfectDaysLoading] = useState(true);
  const [habitHistory, setHabitHistory] = useState({ dates: [], habits: [] });
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const completedCount = habits.filter((habit) => habit.complete).length;
  const progress = habits.length ? (completedCount / habits.length) * 100 : 0;
  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric"
      }).format(new Date()),
    [currentDateKey]
  );

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    setError("");

    request(`/api/habits?date=${currentDateKey}`)
      .then((loadedHabits) => {
        if (!ignore) setHabits(loadedHabits);
      })
      .catch((requestError) => {
        if (!ignore) setError(requestError.message);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [currentDateKey]);

  async function loadStreaks(date = currentDateKey) {
    setIsStreakLoading(true);
    try {
      const loadedStreaks = await request(
        `/api/metrics/streaks?habitId=${STREAK_HABIT_ID}&date=${date}`
      );
      setStreaks({ current: loadedStreaks.current, longest: loadedStreaks.longest });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsStreakLoading(false);
    }
  }

  async function loadPerfectDays(date = currentDateKey) {
    setIsPerfectDaysLoading(true);
    try {
      const loadedPerfectDays = await request(
        `/api/metrics/perfect-days?date=${date}`
      );
      setPerfectDays({
        thisMonth: loadedPerfectDays.thisMonth,
        allTime: loadedPerfectDays.allTime
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsPerfectDaysLoading(false);
    }
  }

  async function loadHabitHistory(date = currentDateKey) {
    setIsHistoryLoading(true);
    try {
      const loadedHistory = await request(`/api/metrics/history?date=${date}`);
      setHabitHistory({ dates: loadedHistory.dates, habits: loadedHistory.habits });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadStreaks(currentDateKey);
    loadPerfectDays(currentDateKey);
    loadHabitHistory(currentDateKey);
  }, [currentDateKey]);

  useEffect(() => {
    function moveToCurrentDay() {
      const latestDateKey = getLocalDateKey();

      if (currentDateKey !== latestDateKey) {
        setIsCelebrationOpen(false);
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
    if (habits.length > 0 && completedCount === habits.length) {
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

  async function toggleHabit(id) {
    const habit = habits.find((item) => item.id === id);
    if (!habit || pendingHabitIds.includes(id)) return;

    const nextComplete = !habit.complete;
    setError("");
    setPendingHabitIds((currentIds) => [...currentIds, id]);
    setHabits((currentHabits) =>
      currentHabits.map((item) =>
        item.id === id ? { ...item, complete: nextComplete } : item
      )
    );

    try {
      await request(`/api/habits/${id}/completion?date=${currentDateKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complete: nextComplete })
      });
      const metricRequests = [loadPerfectDays(), loadHabitHistory()];
      if (id === STREAK_HABIT_ID) metricRequests.push(loadStreaks());
      await Promise.all(metricRequests);
    } catch (requestError) {
      setHabits((currentHabits) =>
        currentHabits.map((item) =>
          item.id === id ? { ...item, complete: habit.complete } : item
        )
      );
      setError(requestError.message);
    } finally {
      setPendingHabitIds((currentIds) => currentIds.filter((itemId) => itemId !== id));
    }
  }

  async function resetHabits() {
    setError("");
    setIsResetting(true);

    try {
      await request(`/api/completions?date=${currentDateKey}`, { method: "DELETE" });
      setHabits((currentHabits) =>
        currentHabits.map((habit) => ({ ...habit, complete: false }))
      );
      setIsCelebrationOpen(false);
      await Promise.all([loadStreaks(), loadPerfectDays(), loadHabitHistory()]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsResetting(false);
    }
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
          {error && <p className="error-message" role="alert">{error}</p>}
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
                disabled={completedCount === 0 || isResetting || pendingHabitIds.length > 0}
              >
                {isResetting ? "Resetting…" : "Reset"}
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

          {isLoading ? (
            <p className="tracker-loading" role="status">Loading today's habits…</p>
          ) : (
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
                  disabled={pendingHabitIds.includes(habit.id) || isResetting}
                >
                  <span aria-hidden="true">{habit.complete ? "✓" : "○"}</span>
                  {habit.complete ? "Done for today" : "Mark as complete"}
                </button>
              </article>
            ))}
          </div>
          )}
        </section>

        <section className="metrics" aria-labelledby="metrics-title">
          <div className="metrics-header">
            <div>
              <p className="tracker-kicker">Progress insights</p>
              <h2 id="metrics-title">Metrics</h2>
            </div>
            <p>Built from your saved daily history</p>
          </div>

          <article className="streak-metric" aria-labelledby="streak-title">
            <div className="streak-intro">
              <span className="streak-icon" aria-hidden="true">↗</span>
              <div>
                <p>Habit streak</p>
                <h3 id="streak-title">No Masturbation</h3>
              </div>
            </div>
            <div className="streak-values" aria-live="polite">
              <div>
                <span className="streak-value">
                  {isStreakLoading ? "—" : streaks.current}
                </span>
                <span className="streak-label">Current streak</span>
                <span className="streak-unit">days</span>
              </div>
              <div>
                <span className="streak-value">
                  {isStreakLoading ? "—" : streaks.longest}
                </span>
                <span className="streak-label">Longest streak</span>
                <span className="streak-unit">days</span>
              </div>
            </div>
          </article>

          <article className="perfect-day-metric" aria-labelledby="perfect-day-title">
            <div className="perfect-day-intro">
              <span className="perfect-day-icon" aria-hidden="true">✓</span>
              <div>
                <p>Full completion</p>
                <h3 id="perfect-day-title">Perfect days</h3>
                <span>A day when all ten habits are completed</span>
              </div>
            </div>
            <div className="perfect-day-values" aria-live="polite">
              <div>
                <span className="perfect-day-value">
                  {isPerfectDaysLoading ? "—" : perfectDays.thisMonth}
                </span>
                <span className="perfect-day-label">This month</span>
              </div>
              <div>
                <span className="perfect-day-value">
                  {isPerfectDaysLoading ? "—" : perfectDays.allTime}
                </span>
                <span className="perfect-day-label">All time</span>
              </div>
            </div>
          </article>

          <article className="history-metric" aria-labelledby="history-title">
            <div className="history-heading">
              <div>
                <p>Last seven days</p>
                <h3 id="history-title">Habit history</h3>
              </div>
              <div className="history-legend" aria-label="History legend">
                <span><i className="legend-complete" />Completed</span>
                <span><i className="legend-incomplete" />Incomplete</span>
              </div>
            </div>

            {isHistoryLoading ? (
              <p className="history-loading" role="status">Loading habit history…</p>
            ) : (
              <div className="history-scroll" tabIndex="0" aria-label="Scrollable seven-day habit history">
                <div
                  className="history-grid"
                  style={{ gridTemplateColumns: `minmax(190px, 1fr) repeat(${habitHistory.dates.length}, 58px)` }}
                >
                  <div className="history-corner">Habit</div>
                  {habitHistory.dates.map((date) => {
                    const dateValue = new Date(`${date}T00:00:00`);
                    return (
                      <time
                        className={`history-date${date === currentDateKey ? " is-today" : ""}`}
                        dateTime={date}
                        key={date}
                      >
                        <span>{new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(dateValue)}</span>
                        <strong>{dateValue.getDate()}</strong>
                      </time>
                    );
                  })}

                  {habitHistory.habits.map((habit) => (
                    <div className="history-row" key={habit.id}>
                      <div className="history-habit-name">{habit.name}</div>
                      {habit.completions.map((complete, index) => (
                        <div
                          className={`history-cell${complete ? " is-complete" : ""}${habitHistory.dates[index] === currentDateKey ? " is-today" : ""}`}
                          aria-label={`${habit.name} on ${habitHistory.dates[index]}: ${complete ? "completed" : "incomplete"}`}
                          key={habitHistory.dates[index]}
                        >
                          <span aria-hidden="true">{complete ? "✓" : ""}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
        </section>
      </main>

      <footer className="site-footer">
        <p>Leonardo James Curry @ 2026</p>
        <nav className="social-bar" aria-label="Social media links">
          {socialLinks.map((socialLink) => (
            <a
              href={socialLink.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={socialLink.name}
              key={socialLink.name}
            >
              <img src={socialLink.icon} alt="" />
            </a>
          ))}
        </nav>
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
