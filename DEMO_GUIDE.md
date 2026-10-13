# Demo Guide: how to view and review this project

Three ways to see FoodShare, from quickest to most complete.

| Option | Needs | Time | Shows |
| --- | --- | --- | --- |
| [A. Read the code on GitHub](#a-read-the-code-on-github) | A browser | 1 min | Code, README, API docs |
| [B. Run it locally](#b-run-it-locally) | Node.js 20+, Git | 5–10 min | The full working app |
| [C. Put it online](#c-put-it-online-optional) | Free Render + MongoDB Atlas accounts | 20–30 min | A link anyone can click |

---

## A. Read the code on GitHub

Repository: https://github.com/Joel-Judson-Paul77/community-food-donation-locator-classic

Where to look:

| Path | What it is |
| --- | --- |
| `README.md` | Features, architecture, API reference, data model |
| `server/src/models/` | Database models: User, Donation, Claim |
| `server/src/controllers/` | Business logic (auth, donations, claims, stats, admin) |
| `server/src/routes/index.js` | Every API endpoint and who may call it |
| `server/tests/api.test.js` | Automated API tests |
| `client/src/pages/` | The React screens |
| `client/src/components/` | Reusable UI (map, cards, navbar…) |

---

## B. Run it locally

### 1. Install

- [Node.js](https://nodejs.org) version 20 or newer (check with `node -v`)
- [Git](https://git-scm.com)

### 2. Get the code and start it

```bash
git clone https://github.com/Joel-Judson-Paul77/community-food-donation-locator-classic.git
cd community-food-donation-locator-classic
npm run install-all
npm run dev
```

Open **http://localhost:5173**.

No database setup is needed. With no `MONGO_URI` set, the server starts a temporary in-memory MongoDB loaded with demo data (Hyderabad listings, users and requests).

> **First start is slow.** It downloads the MongoDB binary once (about 600 MB, then cached). Wait for the terminal to print `API ready on http://localhost:5000/api`.
> Demo data resets every time the server restarts.

### 3. Log in with a demo account

All demo accounts use the password **`Password@123`**.

| Role | Email | What they can do |
| --- | --- | --- |
| Donor | `freshmart@foodshare.test` | Post food, approve/decline requests, mark collected |
| Donor | `annapurna@foodshare.test` | Same, a restaurant |
| Recipient | `ravi@foodshare.test` | Search food, request it, track requests |
| Recipient | `hope@foodshare.test` | Same, a shelter |
| Admin | `admin@foodshare.test` | Manage users, listings and requests |

### 4. Walkthrough (about 5 minutes)

1. **Home page.** Live impact numbers and food that needs picking up soon.
2. **Find food.** Search, filter by category and dietary needs, switch between **List** and **Map**. Allow location access in the browser to sort by nearest and see distances.
3. **Open a listing.** Quantity left, pickup deadline, directions. Notice the donor's phone number is hidden while logged out.
4. **Recipient flow.** Log in as `ravi@foodshare.test`, open any listing, send a request for some quantity.
5. **Donor flow.** Log out, log in as `freshmart@foodshare.test`. **Dashboard → Requests** shows the new request. Click **Approve**. The quantity is reserved and contact details are shared. Then **Awaiting pickup → Mark collected**. The "Items shared" and "People helped" counters go up.
6. **Post food.** As a donor, click **Donate**. Fill in the form, drop a pin on the map (or **Use my location**), publish.
7. **Admin.** Log in as `admin@foodshare.test`. The **Overview** shows platform totals. The **Users**, **Listings** and **Requests** tabs allow search, role changes, blocking and deleting.

### 5. Run the automated tests (optional)

```bash
npm test
```

Expect 6 passing tests covering registration/login, role permissions, geo search, the request → approve → collect flow, and admin access. (The first run also downloads MongoDB.)

### Troubleshooting

| Problem | Fix |
| --- | --- |
| `npm run install-all` errors with permission or "filename too long" | Clone into a short path such as `C:\projects\` |
| Page is blank or shows "Cannot reach the server" | The API is still starting. Wait for the `API ready` message, then refresh |
| Port 5000 or 5173 already in use | Stop the other program, or set `PORT=5001` in `server/.env` |
| Map has no pins | Clear the filters, or widen the distance to **Any distance** |
| Want data to persist between restarts | Create `server/.env` from `server/.env.example` and set `MONGO_URI`, then run `npm run seed` |

---

## C. Put it online (optional)

GitHub stores code but can't run it. To give your mentor a live link, deploy to free hosting. This uses **MongoDB Atlas** (database) and **Render** (the app). In production, one Node service serves both the API and the React site.

### 1. Create the database (MongoDB Atlas)

1. Sign up at https://www.mongodb.com/atlas and create a **free (M0)** cluster.
2. **Database Access** → add a user with a password. Save both.
3. **Network Access** → add IP address `0.0.0.0/0` (allow from anywhere, fine for a demo).
4. **Connect → Drivers** → copy the connection string. It looks like:
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/foodshare`
   Replace `<user>` and `<password>`, and make sure `/foodshare` comes before any `?`.

### 2. Create the web service (Render)

1. Sign up at https://render.com with your GitHub account.
2. **New → Web Service** → pick the `community-food-donation-locator-classic` repo.
3. Fill in:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Build Command | `npm run install-all && npm run build` |
| Start Command | `npm start` |
| Instance type | Free |

4. Add **Environment Variables**:

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGO_URI` | your Atlas connection string |
| `JWT_SECRET` | a long random string (30+ characters) |
| `CLIENT_URL` | your Render URL, e.g. `https://your-app.onrender.com` (set it after the first deploy shows the URL, then redeploy) |
| `MONGOMS_DISABLE_POSTINSTALL` | `1` (skips the unneeded 600 MB MongoDB download) |

5. Click **Create Web Service** and wait for the deploy to finish.

### 3. Load the demo data (one time)

On your own computer, create `server/.env` containing the same `MONGO_URI`, then run:

```bash
npm run seed
```

⚠️ This **wipes** the database it points at and loads the demo users and listings. Only run it against a database you're happy to reset.

### 4. Share the link

Send your mentor the Render URL plus the demo logins from section B.

### Free-tier limits

- The app **sleeps after ~15 minutes idle**. The first visit afterwards takes about a minute to wake up. Open it yourself a few minutes before a demo.
- Uploaded food photos are stored on local disk and **disappear on restart**. Listings still work and show an icon instead. For permanent photos, switch to cloud storage such as Cloudinary or S3.
- Demo listings expire after their pickup-by time. Re-run `npm run seed` shortly before a demo to refresh them.

---

## What to point out to your mentor

- **Full-stack MERN app:** React front end, Express REST API, MongoDB database.
- **Real location search:** MongoDB `2dsphere` geo queries plus an interactive map.
- **Role-based access:** donor, recipient and admin each get their own screens and permissions, enforced on the server.
- **Safe claiming:** approving a request reserves quantity in a single database step, so two people can't claim the same food.
- **Privacy:** contact numbers are only shared once a request is approved.
- **Tested:** automated API tests for the main flows.
