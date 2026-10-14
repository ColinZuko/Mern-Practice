# Pickle & Pan

A recipe blog at [pickleandpan.com](https://pickleandpan.com): a React frontend and an
Express + MongoDB backend.

| Part | Where it runs | Folder |
|---|---|---|
| Frontend (React, Vite, Tailwind) | Vercel | `frontend/` |
| Backend (Express API) | Render, at api.pickleandpan.com | `backend/` |
| Database | MongoDB Atlas (`BlogData`) | |
| Photos and daily backups | AWS S3 (`colinblogstorage`) | |
| Email | Resend | |

Pushing to `main` deploys both the frontend (Vercel) and the backend (Render).

## Running it locally

```bash
cd backend
cp config.env.example config.env   # then fill in the values
npm install
npm start                          # API on http://localhost:5000
```

```bash
cd frontend
npm install
echo VITE_API_URL=http://localhost:5000 > .env.development.local
npm run dev                        # site on http://localhost:5173
```

Locally, emails aren't sent; the links are printed in the backend's log instead.

## Accounts and roles

| Role | Can |
|---|---|
| Reader (everyone who signs up) | Save, like and comment on recipes (after confirming their email) |
| Editor | Write recipes and edit or delete their own |
| Admin | Everything, plus manage users, roles and backups |

Admins change roles on the **Manage users** page. To make the first admin from the command line:

```bash
cd backend
node setRole.js you@example.com admin
```

## Backups

The backend saves a copy of the whole database to S3 once a day and keeps 30 days.
Admins can see them and make one on demand on the **Manage users** page.

```bash
cd backend
node backupDb.js list                                   # show backups
node backupDb.js now                                    # make one now
node backupDb.js restore <key>                          # restore into BlogData_restore to inspect
node backupDb.js restore <key> --into BlogData --overwrite   # replace the live database
```

## Other scripts

- `node convertImages.js` converts older recipe photos to WebP (dry run unless `--apply`).

## Keeping the free Render instance awake

UptimeRobot pings `https://mern-blog-backend-blt0.onrender.com/health` every 5 minutes.
`.github/workflows/keep-alive.yml` does the same as a backup.
