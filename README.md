# Town Hall Meter

A lightweight internal web app for employees to rate Town Hall meetings using a single emoji scale.

---

## Features

- **Single-click emoji voting** — 5-point scale, no forms, no friction
- **Auto-submit** on selection with animated confirmation
- **Confetti** for 🚀 votes
- **Results locked until after voting** — no peeking at scores before you submit
- **Trend line** showing the last 10 Town Halls
- **Duplicate prevention** — one vote per user per Town Hall date (anonymous UUID)
- **Admin dashboard** — create/edit/delete Town Hall dates, export CSV
- **Mobile-first** responsive design

---

## File Structure

```
town-hall-meter/
├── backend/
│   ├── data/               # SQLite database (auto-created)
│   ├── routes/
│   │   ├── admin.js        # Admin CRUD + CSV export
│   │   ├── townhalls.js    # Town hall lookup + results
│   │   └── votes.js        # Vote submission + status check
│   ├── db.js               # Database setup & schema
│   ├── server.js           # Express entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminView.jsx
│   │   │   ├── ConfirmationView.jsx
│   │   │   ├── Confetti.jsx
│   │   │   ├── ResultsView.jsx
│   │   │   └── VotingCard.jsx
│   │   ├── App.jsx
│   │   ├── api.js          # API client
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── package.json            # Workspace root with dev scripts
└── README.md
```

---

## Quick Start (Development)

### Prerequisites

- Node.js 18+
- npm 9+

### Install dependencies

```bash
npm run install:all
```

### Start dev servers

```bash
npm run dev
```

This starts:
- **Backend** at `http://localhost:3001` (Express + SQLite)
- **Frontend** at `http://localhost:5173` (Vite dev server, proxies `/api` to backend)

Open `http://localhost:5173` in your browser.

---

## Production Deployment

### Build the frontend

```bash
npm run build
```

This outputs the frontend bundle to `frontend/dist/`.

### Run the production server

```bash
npm start
```

The Express server will serve both the API and the static frontend from a single process on port `3001` (or `$PORT`).

### Environment Variables

| Variable      | Default    | Description                               |
|---------------|------------|-------------------------------------------|
| `PORT`        | `3001`     | HTTP port for the server                  |
| `ADMIN_TOKEN` | `admin123` | Token required to access the admin panel  |

**Always set `ADMIN_TOKEN` to a strong secret in production.**

```bash
ADMIN_TOKEN=your-strong-secret PORT=8080 npm start
```

### Deployment options

**Fly.io / Railway / Render (recommended for simplicity)**

1. Set environment variables in the platform dashboard
2. Set the start command to `npm start`
3. The SQLite database lives in `backend/data/townhall.db` — mount a persistent volume at `/app/backend/data` to persist data across deploys

**Docker**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm run install:all && npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

**Reverse proxy (nginx)**

Point nginx at the Express server and add SSL termination:

```nginx
location / {
    proxy_pass http://localhost:3001;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;
}
```

---

## Admin Panel

Access the admin panel at `/#admin` (e.g. `https://yourdomain.com/#admin`).

Enter the `ADMIN_TOKEN` when prompted. The session is stored in `sessionStorage` (cleared when the browser tab closes).

**Admin capabilities:**
- Create Town Hall dates with optional titles
- Edit or delete existing dates (deletes all associated votes)
- View average score and response count per date
- Export all data as CSV

---

## Authentication & Access Control

### Internal access only

This app is designed for internal use. You have two main options:

**Option 1: Network-level restriction**
Deploy behind a VPN or internal network and never expose it publicly. No code changes needed.

**Option 2: OAuth / SSO (Google, Okta, Azure AD)**

Add an auth middleware to `backend/server.js` using your provider's SDK:

```js
// Example: Google OAuth with passport.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback',
  hd: 'yourcompany.com',   // restrict to your domain
}, (accessToken, refreshToken, profile, done) => done(null, profile)));

app.use(passport.initialize());
app.use(passport.session());

// Protect all routes
app.use((req, res, next) => {
  if (req.isAuthenticated()) return next();
  if (req.path.startsWith('/auth')) return next();
  res.redirect('/auth/google');
});
```

Once authenticated, replace the localStorage UUID with the authenticated user's email (or employee ID) for more reliable duplicate prevention:

```js
// In the vote submission handler, replace:
const userId = req.headers['x-user-id'];
// With:
const userId = req.user.email;
```

---

## Data Model

### `town_halls`

| Column       | Type    | Notes                        |
|--------------|---------|------------------------------|
| `id`         | INTEGER | Primary key                  |
| `date`       | TEXT    | `YYYY-MM-DD`, unique         |
| `title`      | TEXT    | Optional display title       |
| `created_at` | TEXT    | ISO timestamp                |

### `votes`

| Column         | Type    | Notes                              |
|----------------|---------|------------------------------------|
| `id`           | INTEGER | Primary key                        |
| `town_hall_id` | INTEGER | FK → `town_halls.id`               |
| `user_id`      | TEXT    | Anonymous UUID from localStorage   |
| `rating`       | INTEGER | 1–5                                |
| `emoji`        | TEXT    | e.g. `🚀`                          |
| `emoji_label`  | TEXT    | e.g. `Let's go`                    |
| `timestamp`    | TEXT    | ISO timestamp                      |

Unique constraint on `(town_hall_id, user_id)` prevents duplicate votes.

---

## API Reference

### Public

| Method | Path                              | Description                          |
|--------|-----------------------------------|--------------------------------------|
| GET    | `/api/townhalls/current`          | Get the most recent Town Hall        |
| GET    | `/api/votes/status?townhallId=X`  | Check if user has voted (X-User-ID header) |
| POST   | `/api/votes`                      | Submit a vote (X-User-ID header)     |
| GET    | `/api/townhalls/:id/results`      | Get results (requires prior vote)    |

### Admin (requires `Authorization: Bearer <token>`)

| Method | Path                              | Description                    |
|--------|-----------------------------------|--------------------------------|
| GET    | `/api/admin/townhalls`            | List all Town Halls with stats |
| POST   | `/api/admin/townhalls`            | Create a Town Hall             |
| PUT    | `/api/admin/townhalls/:id`        | Update a Town Hall             |
| DELETE | `/api/admin/townhalls/:id`        | Delete a Town Hall + votes     |
| GET    | `/api/admin/export`               | Download votes as CSV          |
