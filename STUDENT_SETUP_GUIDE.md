# 🎓 BLDE-PRISM — Complete Student Setup & Project Guide

> **Publications & Research Impact Statistics Manager (PRISM)**  
> **BLDE (Deemed to be University), Vijayapura**

---

## 🚀 Quick Start (4 Steps)

### 1. Install Dependencies
Open a terminal in this project folder and run:
```bash
npm install
```

---

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
# On Windows PowerShell:
Copy-Item .env.example .env

# On Mac / Linux:
cp .env.example .env
```

Open `.env` in your editor and provide your PostgreSQL connection string:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/blde_prism?schema=public"
NEXTAUTH_SECRET="blde-prism-super-secret-key-2026-production"
NEXTAUTH_URL="http://localhost:3000"
```

> **Tip for PostgreSQL:** You can use local PostgreSQL, pgAdmin, Docker, or free cloud databases (Neon.tech, Supabase, Railway, Render).

---

### 3. Initialize Database & Seed Real Institutional Dataset
Run the following commands to create the database schema and populate all **183 faculty members, 34 departments, 2,194 scientific publications, and 137 profile photos**:

```bash
# Push schema to database
npx prisma db push

# Populate full real dataset with local avatars
npm run db:seed-full
```

---

### 4. Start the Application
```bash
npm run dev
```

Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Login Accounts & Credentials

| Role | Email | Password | Access / Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@blde.ac.in` | `admin123` | Full control, User Management, Reports, Verification |
| **Verifier** | `verifier@blde.ac.in` | `faculty123` | Verify publications, import datasets, generate reports |
| **Faculty Member** | Any official faculty email (e.g. `kusaldas@bldedu.ac.in`, `dr.anilkumar@bldedu.ac.in`) | `BLDE@faculty2026` | Edit profile, view publications & department stats |

---

## 📂 Project Architecture & File Map

```
blde-prism/
├── prisma/
│   ├── schema.prisma                      # Database schema (PostgreSQL)
│   └── faculty_publications_dataset.xlsx  # Official BLDE research dataset (3,476 rows)
├── public/
│   ├── avatars/                           # 137 cached faculty profile photos (100% offline)
│   └── blde-logo.png                      # Institutional branding logo
├── scripts/
│   ├── seed-full.ts                       # Complete dataset import & deduplication pipeline
│   └── import-faculty.ts                  # Avatar fetcher & image processor
├── src/
│   ├── app/
│   │   ├── (auth)/login/                  # Secure authentication portal
│   │   ├── dashboard/                     # Analytics dashboard (KPIs, Charts, Top Researchers)
│   │   ├── publications/                  # Publications explorer, filters & detail pages
│   │   ├── authors/                       # Faculty directory & profile pages with Dr. prefix
│   │   │   └── [id]/                      # Individual faculty profile with metrics & co-authors
│   │   ├── departments/                   # Department-wise analytics & output breakdown
│   │   ├── journals/                      # Journal indexing (Scopus, WoS, PubMed, UGC-CARE)
│   │   ├── reports/                       # NAAC/NIRF/UGC report builder with PDF generator
│   │   ├── import/                        # CSV / Excel dataset import UI
│   │   ├── admin/users/                   # Admin user & role management
│   │   └── api/                           # Backend API route handlers
│   ├── components/
│   │   ├── FacultyAvatar.tsx              # Resilient avatar component (local image + fallback)
│   │   └── layout/Sidebar.tsx             # Institutional navigation sidebar
│   ├── lib/
│   │   ├── auth.ts                        # NextAuth authentication config
│   │   ├── prisma.ts                      # Prisma client singleton
│   │   ├── reportPdf.ts                   # PDF report generator (NIRF/NAAC/UGC formatted)
│   │   └── utils.ts                       # Formatting & styling utilities
│   └── middleware.ts                      # Route protection & static asset matcher
└── package.json
```

---

## 🌟 Key Features Built-In

1. **Dashboard Analytics:** Live KPI summary cards, Annual Publication Output trend chart, Department Distribution chart, Top Cited Faculty Researchers.
2. **Faculty Profiles:** Displays Vidwan ID, ORCID, Scopus Author ID, Google Scholar ID, ResearcherID, Education, Experience, Expertise tags, Co-authors network, and Publication history.
3. **Publications Directory:** Real-time search, filters by Year, Journal, Department, and Publication Type (Articles, Reviews, Case Reports, Book Chapters).
4. **PDF & Excel Reporting:** One-click generation of NAAC, NIRF, and UGC-CARE compliant PDF reports and Excel data sheets.
5. **Offline Readiness:** All 137 faculty profile photos are stored locally in `public/avatars/`, ensuring full functionality on any laptop without internet access.

---

## 🛠️ Common Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts development server on `http://localhost:3000` |
| `npm run build` | Builds production-optimized Next.js bundle |
| `npm run start` | Runs production server |
| `npm run db:seed-full` | Resets & imports all real faculty, publications & departments |
| `npx prisma studio` | Opens interactive visual database browser in web browser |
| `npm run lint` | Runs Next.js ESLint checks |
