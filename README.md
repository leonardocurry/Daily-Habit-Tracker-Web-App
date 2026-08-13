# Daily Habit Tracker

Track your top daily habits and mark them complete each day. Data is saved locally in your browser.

## Features

- Add and remove habits
- Check off habits as you complete them each day
- Progress bar showing daily completion
- Streak tracking per habit
- Data persists in localStorage across sessions

## Development

```bash
npm install
npm run dev
```

This starts both the Vite React client and the Node/Express API. Open the Vite
URL shown in the terminal (normally `http://localhost:5173`).

## Data storage

Habit definitions and daily completion history are stored in a local SQLite
database at `data/habits.db`. The database is created and seeded automatically
when the server starts. Database files are ignored by Git so personal tracking
history is not committed to the repository.

Useful commands:

```bash
npm run server  # API and production build on http://localhost:3001
npm run client  # Vite client only
npm run build   # Create the production client in dist/
```

For production, run `npm run build` once and then `npm run server`. The Express
server serves both the API and the generated React app.

## Personal celebration image

1. Copy your image into the `public` folder.
2. Open `src/config.js`.
3. Change `celebrationImage.path` to the image filename, beginning with `/`.
4. Update `celebrationImage.alt` with a short description of the image.

For example, an image at `public/my-photo.jpg` uses this configuration:

```js
export const celebrationImage = {
  path: "/my-photo.jpg",
  alt: "Rodrigo celebrating a completed day"
};
```

Build for production:

```bash
npm run build
npm run preview
```
