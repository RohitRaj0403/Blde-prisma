==================================================================================
                 BLDE-PRISM RESEARCH PORTAL - STUDENT HANDOVER MANUAL
         Publications & Research Impact Statistics Management System
==================================================================================

PROJECT OVERVIEW:
-----------------
BLDE-PRISM is a next-generation academic research impact and faculty publication
management platform developed for BLDE (Deemed to be University). It tracks,
indexes, and visualizes institutional research output across 34 departments, 183
faculty members, 2,194 unique publications, and 4,000+ research keywords with
support for Scopus, WoS, PubMed, and UGC-CARE verification workflows.

TECH STACK:
-----------
- Frontend: Next.js 14 App Router, React 18, Tailwind CSS, Lucide Icons, Recharts
- Backend: Next.js Server Components, Server Actions & REST API Route Handlers
- ORM: Prisma ORM v5.14
- Database: PostgreSQL (with full pre-seeded dump lde_prism_postgres.sql)
- Authentication: NextAuth.js (Auth.js v5) with bcrypt hashing & Role-Based Access
- Containerization: Docker, Docker Compose (multi-stage production builds)

----------------------------------------------------------------------------------
1. QUICK START FOR VIVA / LOCAL EVALUATION (ZERO FRICTION)
----------------------------------------------------------------------------------

Option A (Windows 1-Click Launcher):
1. Double-click un.bat
2. The browser will open automatically at http://localhost:3000

Option B (Terminal Commands):
1. Ensure Node.js 18+ and PostgreSQL are running
2. Open terminal in project root:
   npm install
   npx prisma generate
   npm run dev
3. Open http://localhost:3000

Option C (Turnkey Docker Compose):
1. Ensure Docker Desktop is running
2. Run:
   docker compose up -d --build
3. Open http://localhost:3000

----------------------------------------------------------------------------------
2. DEFAULT LOGIN CREDENTIALS
----------------------------------------------------------------------------------
Role               Email                      Password
----------------------------------------------------------------------------------
Admin (IQAC)       admin@blde.ac.in           admin123
Verifier (Library) verifier@blde.ac.in        faculty123
Faculty Member     mamatha.k@bldedu.ac.in     BLDE@faculty2026 (or faculty123)
Faculty Member     kusaldas@bldedu.ac.in      BLDE@faculty2026 (or faculty123)

Note: All 183 faculty members can log in using their official email and either
BLDE@faculty2026 or aculty123.

----------------------------------------------------------------------------------
3. KEY FEATURES FOR VIVA DEMONSTRATION
----------------------------------------------------------------------------------
1. Executive Dashboard (/):
   - Real-time KPIs: 183 Faculty, 2,194 Publications, 34 Departments.
   - Interactive citation charts, department rankings, indexing breakdown.
2. Faculty Directory (/authors):
   - Complete grid of 183 faculty cards with photos, designations, and badges.
   - Real-time search by name, department, designation, and school.
3. Faculty Profile Page (/authors/[id]):
   - Comprehensive bio, education, experience, areas of expertise tags.
   - Vidwan ID, ORCID, Scopus ID, WoS ResearcherID, Google Scholar badges.
   - Tabular publication list with citations, DOI badges, and year filters.
4. Publications Explorer (/publications):
   - Multi-criteria filtering by indexing (Scopus, WoS, PubMed, UGC), Year,
     Department, Publication Type, and Verification Status.
5. Journals & Venues Catalog (/journals):
   - 960+ cleaned, peer-reviewed journals with ISSNs and article counts.
   - Full 25-item per-page pagination with navigation controls.
6. Verification & IQAC Admin (/admin/users, /import):
   - Peer review verification workflow (Pending -> Verified / Rejected).
   - Multi-role access control (Admin, Verifier, Faculty, Viewer).

----------------------------------------------------------------------------------
4. DATABASE SEEDING & SQL RESTORE
----------------------------------------------------------------------------------
If you need to restore or re-seed the database:
- Via SQL Dump:
  psql -U postgres -d blde_prism -f blde_prism_postgres.sql
- Via Prisma Script:
  npm run db:seed-full

----------------------------------------------------------------------------------
Developed for BLDE (Deemed to be University) · IQAC & Research Cell
==================================================================================
