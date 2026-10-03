# BLDE-PRISM: Production & Cloud Hosting Guide

This guide provides step-by-step instructions for students and evaluators to deploy **BLDE-PRISM** to cloud hosting platforms (Render, Railway, Docker, and Supabase).

---

## 1. Cloud Architecture Overview

`
                        ┌────────────────────────┐
                        │   Next.js 14 Web App   │
                        │  (SSR + API Routes)    │
                        └───────────┬────────────┘
                                    │ Prisma ORM
                        ┌───────────▼────────────┐
                        │ Managed PostgreSQL DB  │
                        │ (Supabase / Render /   │
                        │      Railway)          │
                        └────────────────────────┘
`

---

## 2. Option A: Free Deployment on Render.com (Recommended)

### Step 1: Create a PostgreSQL Database on Render
1. Sign up at Render.com (https://render.com/).
2. Click **New +** -> **PostgreSQL**.
3. Set Name to lde-prism-db, Database to lde_prism, User to lde_user.
4. Click **Create Database**.
5. Once created, copy the **Internal Database URL** (or External URL).

### Step 2: Restore the Pre-Seeded Dataset
In your terminal, load the included SQL dump into Render's PostgreSQL database:
`ash
psql <RENDER_EXTERNAL_DATABASE_URL> -f blde_prism_postgres.sql
`

### Step 3: Deploy the Next.js Web Service on Render
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the build settings:
   - **Environment:** Node
   - **Build Command:** 
pm ci && npx prisma generate && npm run build
   - **Start Command:** 
pm start
4. Add Environment Variables:
   - DATABASE_URL: <YOUR_RENDER_INTERNAL_DATABASE_URL>
   - NEXTAUTH_SECRET: <GENERATE_32_CHAR_STRING> (e.g. openssl rand -base64 32)
   - NEXTAUTH_URL: https://your-service-name.onrender.com
   - NODE_ENV: production
5. Click **Create Web Service**. Your portal will be live in 2-3 minutes!

---

## 3. Option B: Turnkey Deployment on Railway.app

1. Sign up at Railway.app (https://railway.app/).
2. Click **New Project** -> **Provision PostgreSQL**.
3. In the database settings, connect via CLI or pgAdmin and run lde_prism_postgres.sql.
4. Click **New** -> **GitHub Repo** and select this project.
5. In variables, add:
   - DATABASE_URL: Link to PostgreSQL service URL
   - NEXTAUTH_SECRET: lde_prism_production_secret_key_2026_secure
   - NEXTAUTH_URL: https://your-app-domain.railway.app
6. Railway will automatically build and expose the application on a public HTTPS domain.

---

## 4. Option C: Turnkey Local / Server Deployment with Docker Compose

If you have a VPS (Ubuntu/Debian) or local Docker Desktop:
`ash
# Clone or unzip repository
cd blde-prism

# Launch both PostgreSQL and Next.js containers with one command
docker compose up -d --build

# View real-time logs
docker compose logs -f
`
The application will be accessible immediately on http://localhost:3000 with the database automatically initialized from lde_prism_postgres.sql.

---

## 5. Environment Variables Reference

| Variable | Description | Example |
| :--- | :--- | :--- |
| DATABASE_URL | PostgreSQL connection string | postgresql://user:pass@host:5432/blde_prism?schema=public |
| NEXTAUTH_SECRET | Secret token used to encrypt session JWTs | lde_prism_jwt_session_secret_key_32_chars |
| NEXTAUTH_URL | Canonical public URL of your portal | http://localhost:3000 or https://prism.bldedu.ac.in |
| NODE_ENV | Runtime environment | production |
| PORT | Listening web server port | 3000 |

---

## 6. Seed & Maintenance Commands

`ash
# Run migrations
npx prisma migrate deploy

# Launch Prisma Studio GUI database inspector
npx prisma studio

# Re-seed the full 183 faculty & 2,194 publications dataset
npm run db:seed-full
`
