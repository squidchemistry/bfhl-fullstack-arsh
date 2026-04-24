# BFHL Graph Processor

Full-stack graph processing system for the SRM Full Stack Engineering Challenge.

## Project Structure

```
FullStack_Bajaj/
├── backend/
│   ├── server.js              # Express entry point
│   ├── package.json
│   ├── routes/
│   │   └── bfhlRoutes.js      # POST /bfhl route
│   ├── controllers/
│   │   └── bfhlController.js  # Request validation & response
│   ├── services/
│   │   └── graphService.js    # Business logic + user metadata
│   └── utils/
│       └── graphProcessor.js  # Core graph engine (zero deps)
├── frontend/
│   ├── index.html
│   ├── css/styles.css
│   └── js/app.js
├── .gitignore
└── README.md
```

## Quick Start

### Backend

```bash
cd backend
npm install
npm run dev          # starts on http://localhost:3000
```

### Frontend

Open `frontend/index.html` in a browser, or serve it:

```bash
cd frontend
npx -y serve .       # starts on http://localhost:3000 (use another port)
```

> **Note:** Update `API_BASE_URL` in `frontend/js/app.js` if your backend runs on a different URL.

## API Reference

### `GET /`

Health check.

**Response:**
```json
{ "status": "ok", "service": "BFHL Graph Processing API", "timestamp": "..." }
```

### `POST /bfhl`

Process directed edges.

**Request:**
```json
{ "data": ["A->B", "A->C", "B->D"] }
```

**Response:**
```json
{
  "user_id": "arsh_verma_24042004",
  "email_id": "arsh@example.com",
  "college_roll_number": "RA2211003012345",
  "hierarchies": [
    {
      "root": "A",
      "tree": { "A": { "B": { "D": {} }, "C": {} } },
      "has_cycle": false,
      "depth": 3
    }
  ],
  "invalid_entries": [],
  "duplicate_edges": [],
  "summary": {
    "total_trees": 1,
    "total_cycles": 0,
    "largest_tree_root": "A"
  }
}
```

## Deployment

### Backend → Render

1. Push to GitHub
2. Create a **Web Service** on [render.com](https://render.com)
3. Set:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Render auto-sets `PORT`

### Frontend → Vercel / Netlify

1. Create a new project pointing to the `frontend/` directory
2. No build step needed (static files)
3. Update `API_BASE_URL` in `js/app.js` to your Render URL

## Configuration

| Setting | Location | Purpose |
|---------|----------|---------|
| User metadata | `backend/services/graphService.js` | `user_id`, `email_id`, `college_roll_number` |
| API URL | `frontend/js/app.js` | `API_BASE_URL` constant |
| Server port | Environment variable `PORT` | Defaults to `3000` |
