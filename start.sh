#!/usr/bin/env bash
echo =====================================================================
echo  BLDE-PRISM RESEARCH PORTAL LAUNCHER
echo =====================================================================
echo "

if ! command -v node &> /dev/null; then
 echo [ERROR] Node.js is not installed. Please install Node.js 18+.
 exit 1
fi

if [ ! -d node_modules ]; then
 echo [INFO] Installing npm dependencies...
 npm install
fi

echo [INFO] Generating Prisma Client...
npx prisma generate

echo [INFO] Starting server on http://localhost:3000 ...
echo Default Admin:   admin@blde.ac.in   / admin123
echo Default Faculty: mamatha.k@bldedu.ac.in / BLDE@faculty2026
echo 

npm run dev
