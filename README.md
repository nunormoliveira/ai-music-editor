# AI Music Editor

This repository hosts a small full-stack playground for experimenting with audio uploads and editing tools. The code base is now split into dedicated frontend and backend folders so it is immediately clear which runtime each part belongs to.

## Project structure

```
.
├── backend/              # Express API for audio uploads
│   ├── index.js          # Entry point for the file upload server
│   └── package.json      # Backend dependencies and scripts
├── frontend/             # React + Vite single page application
│   ├── src/              # Application source code
│   ├── public/           # Static assets served by Vite
│   ├── package.json      # Frontend dependencies and scripts
│   └── vite.config.js    # Vite configuration
└── .gitignore
```

## Getting started

Both applications are managed independently so you can work on either side without pulling in the other one's dependencies.

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

The development server listens on port `5173` by default.

### Backend (Express API)

```bash
cd backend
npm install
npm start
```

The upload API listens on port `5000` by default and exposes two endpoints:

- `GET /api/health` – quick health check endpoint.
- `POST /api/upload` – accepts an `audio` file field up to 50 MB and returns the public URL.

## Notes

- `frontend/node_modules` is intentionally not committed. Run `npm install` inside each workspace to generate the local dependencies.
- Adjust the `PORT` environment variable before starting the backend if you need a different port.
