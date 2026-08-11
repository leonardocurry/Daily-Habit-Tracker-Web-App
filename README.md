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
