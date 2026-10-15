# Community Food Donation and Surplus Locator
Deployed on vercel in https://community-food-donation-locator-cla.vercel.app/
A platform that helps communities donate, discover, and claim surplus food.

Restaurants, stores, caterers and households post extra food with a pickup location and deadline. NGOs, shelters and individuals find it on a live map, request what they need, and collect it once the donor approves.

> **Classic edition:** this is the original light green theme. A dark, monochrome redesign lives in [community-food-donation-locator](https://github.com/Joel-Judson-Paul77/community-food-donation-locator). The features and backend are identical.

## Project Status

Working MVP: all planned features are implemented, with an automated API test suite.

## Features

| Planned feature | Implementation |
| --- | --- |
| User registration and login | JWT authentication, bcrypt-hashed passwords, roles: **donor**, **recipient**, **admin** |
| Food donation posting | Title, category, dietary tags, quantity + unit, pickup-by time, address, map pin, optional photo upload. Donors can edit, close or withdraw listings |
| Surplus food search | Text search, category and dietary filters, sort by nearest / expiring soonest / newest / largest quantity, pagination |
| Location-based food discovery | Browser geolocation + MongoDB `2dsphere` geo queries (`$geoNear`), radius filter (2–50 km), distance on every card, interactive Leaflet/OpenStreetMap view |
| Food claiming / request system | Recipients request a quantity with a message. Donors approve, decline or mark collected. Quantities are reserved atomically, so food can't be over-claimed. Contact numbers are shared only after approval |
| Donor and recipient dashboards | Impact stats (items shared, people helped), incoming request queue, listings table, request tracking with pickup details and directions |
| Admin management | Platform stats, user search, role changes, block/unblock, delete users and listings, view all requests |

Other details:
- Listings expire automatically when their pickup-by time passes.
- Address → map lookup and map → address autofill use OpenStreetMap Nominatim (no API key).
- Responsive layout that works on phones.

## Tech Stack

- **Frontend:** React 18, React Router 6, Vite, Leaflet + react-leaflet, plain CSS
- **Backend:** Node.js, Express 5, Mongoose 8, JWT, bcryptjs, Multer (image uploads)
- **Database:** MongoDB (falls back to an auto-seeded in-memory MongoDB when no connection string is set)
- **Testing:** Node's built-in test runner + Supertest

## Architecture

```
┌────────────────────────┐   /api (JSON + JWT)   ┌───────────────────────────┐      ┌──────────┐
│  React SPA (Vite)      │ ────────────────────▶ │  Express REST API         │ ───▶ │ MongoDB  │
│  pages · components    │ ◀──────────────────── │  routes → controllers     │      │ users    │
│  AuthContext · api.js  │                       │  auth / upload middleware │      │ donations│
│  Leaflet + OSM tiles   │                       │  Mongoose models          │      │ claims   │
└────────────────────────┘                       └───────────────────────────┘      └──────────┘
```

In development, Vite (port 5173) proxies `/api` and `/uploads` to Express (port 5000). In production, Express serves the built React app itself, so you deploy one Node service.

## Folder Structure

```
food-donation-locator/
├── package.json              # root scripts (run both apps together)
├── server/
│   ├── src/
│   │   ├── index.js          # starts server, connects DB
│   │   ├── app.js            # express app (middleware, routes, static)
│   │   ├── config/           # env vars, DB connection
│   │   ├── models/           # User, Donation, Claim
│   │   ├── controllers/      # auth, donation, claim, stats, admin
│   │   ├── routes/index.js   # all API routes
│   │   ├── middleware/       # auth (protect/authorize), upload, errors
│   │   ├── utils/helpers.js
│   │   └── seed/             # demo data
│   ├── tests/api.test.js
│   └── uploads/              # uploaded food photos
└── client/
    ├── index.html
    └── src/
        ├── App.jsx           # routes
        ├── api.js            # fetch wrapper
        ├── context/AuthContext.jsx
        ├── components/       # Navbar, DonationCard, MapView, LocationPicker, ClaimRequests…
        ├── pages/            # Home, Browse, DonationDetail, DonationForm, dashboards, auth…
        ├── utils/            # constants, formatting, geolocation
        └── styles.css
```

> **Reviewing this project?** See the step-by-step **[Demo Guide](DEMO_GUIDE.md)**: run it locally, a demo walkthrough, and how to put it online.

## Getting Started

**Prerequisite:** Node.js 20 or newer.

```bash
npm run install-all     # installs root, server and client dependencies
npm run dev             # API on :5000 + React on :5173
```

Open **http://localhost:5173**.

With no database configured, the API starts a temporary in-memory MongoDB and loads demo data. The first run downloads the MongoDB binary (around 600 MB, cached afterwards). Data resets on every restart.

### Using a real database

1. Copy `server/.env.example` to `server/.env`.
2. Set `MONGO_URI` to a local MongoDB (`mongodb://127.0.0.1:27017/foodshare`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.
3. Set `JWT_SECRET` to a long random string.
4. Load the demo data (optional; this **wipes** the database first):

```bash
npm run seed
```

### Environment variables (`server/.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | API port |
| `MONGO_URI` | *(empty → in-memory DB)* | MongoDB connection string |
| `JWT_SECRET` | dev-only value | Signs login tokens (**required in production**) |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin(s), comma-separated |

Optional client variables (`client/.env`): `VITE_DEFAULT_LAT`, `VITE_DEFAULT_LNG` set the map's starting point before location access (defaults to Hyderabad).

### Demo accounts

All demo accounts use the password `Password@123`.

| Role | Email |
| --- | --- |
| Admin | `admin@foodshare.test` |
| Donor (restaurant) | `annapurna@foodshare.test` |
| Donor (supermarket) | `freshmart@foodshare.test` |
| Recipient (shelter) | `hope@foodshare.test` |
| Recipient (individual) | `ravi@foodshare.test` |

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Run API and React dev servers together |
| `npm test` | Run API tests (in-memory DB) |
| `npm run build` | Build the React app into `client/dist` |
| `npm start` | Start the API in production mode (also serves `client/dist`) |
| `npm run seed` | Reset the database in `MONGO_URI` and load demo data |

## API Reference

All endpoints are prefixed with `/api`. 🔒 = needs `Authorization: Bearer <token>`.

**Auth**
| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | public | Create a donor or recipient account |
| POST | `/auth/login` | public | Log in and receive a JWT |
| GET | `/auth/me` | 🔒 any | Current user |
| PUT | `/auth/me` | 🔒 any | Update profile / change password |

**Donations**
| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/donations` | public | Search open listings. Query: `q, category, dietary, lat, lng, radius, sort, page, limit` |
| GET | `/donations/:id` | public | Listing details (+ your request, if any) |
| GET | `/donations/mine` | 🔒 donor | Your listings with request counts |
| POST | `/donations` | 🔒 donor | Create a listing (JSON or multipart with `image`) |
| PUT | `/donations/:id` | 🔒 owner/admin | Edit a listing |
| PATCH | `/donations/:id/complete` | 🔒 owner/admin | Close the listing |
| PATCH | `/donations/:id/cancel` | 🔒 owner/admin | Withdraw the listing |

**Claims (requests)**
| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/claims` | 🔒 recipient | Request food `{ donationId, quantity, message }` |
| GET | `/claims/mine` | 🔒 recipient | Your requests |
| GET | `/claims/incoming` | 🔒 donor | Requests for your listings. Query: `status, donation` |
| PATCH | `/claims/:id/approve` | 🔒 donor | Approve and reserve the quantity |
| PATCH | `/claims/:id/reject` | 🔒 donor | Decline `{ note }` |
| PATCH | `/claims/:id/collect` | 🔒 donor | Mark as picked up |
| PATCH | `/claims/:id/cancel` | 🔒 recipient | Cancel (returns reserved quantity) |

**Stats & admin**
| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/stats/public` | public | Platform impact numbers |
| GET | `/stats/me` | 🔒 any | Dashboard numbers for your role |
| GET | `/admin/stats` | 🔒 admin | Platform overview |
| GET | `/admin/users` | 🔒 admin | List/search users |
| PATCH | `/admin/users/:id` | 🔒 admin | Change role / block / unblock |
| DELETE | `/admin/users/:id` | 🔒 admin | Delete a user and their data |
| GET | `/admin/donations` | 🔒 admin | List all listings |
| DELETE | `/admin/donations/:id` | 🔒 admin | Delete a listing |
| GET | `/admin/claims` | 🔒 admin | List all requests |

## Data Model

```
User      { name, email (unique), password (hashed), role: donor|recipient|admin,
            phone, organization, address, isActive }

Donation  { donor → User, title, description, category, dietary[], quantity, quantityAvailable,
            unit, expiresAt, address, pickupInstructions,
            location: GeoJSON Point [lng, lat] (2dsphere index), image,
            status: available|reserved|completed|expired|cancelled }

Claim     { donation → Donation, donor → User, recipient → User, quantity, message,
            status: pending|approved|rejected|cancelled|collected,
            donorNote, respondedAt, collectedAt }
```

**Request lifecycle**

```
recipient requests ─▶ pending ─┬─▶ approved ─┬─▶ collected   (donor hands over food)
                               │   (qty      └─▶ cancelled   (recipient cancels, qty returned)
                               │   reserved)
                               ├─▶ rejected   (donor declines / listing closed)
                               └─▶ cancelled  (recipient cancels)
```

When a listing's available quantity reaches 0 it becomes **reserved**. Once every approved request is collected, it becomes **completed**.

## Deployment

1. `npm run install-all && npm run build`
2. Set `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET` and `CLIENT_URL` on your host (Render, Railway, a VPS…).
3. `npm start`: one service serves both the API and the React app.

Uploaded images are stored on local disk (`server/uploads`). On hosts with ephemeral disks, switch to cloud storage such as S3 or Cloudinary.

## Future Enhancements

- Email/SMS/push notifications for new requests and approvals
- Real-time updates with WebSockets
- Ratings and feedback after pickups
- Volunteer delivery for recipients who can't travel
- Recurring donations (e.g. daily bakery surplus)
- Food-safety checklist and verification for donors
