# QuillRx — Digital Prescription & Clinic Management

A modern, production-ready prescription management web app for Indian physicians. Create digital prescriptions, manage patients, generate professional PDFs, and share via WhatsApp — all from a mobile-friendly interface.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Set Up the Database](#4-set-up-the-database)
  - [5. Run the Development Server](#5-run-the-development-server)
- [Production Build](#production-build)
- [Docker Deployment](#docker-deployment)
  - [Docker Compose](#docker-compose)
  - [Standalone Docker](#standalone-docker)
- [Cloud Deployment](#cloud-deployment)
- [Project Structure](#project-structure)
- [API Routes](#api-routes)
- [App Flow](#app-flow)
- [Scripts Reference](#scripts-reference)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

- **Digital Prescriptions** — Create prescriptions with medicines, dosage, vitals, diagnosis, and fees in under 2 minutes
- **Professional PDF Generation** — Auto-generated A4 PDF prescriptions with clinic branding (logo + digital signature)
- **WhatsApp Sharing** — Send prescriptions directly to patients via WhatsApp
- **QR Code** — Generate QR codes for easy prescription access
- **Patient Management** — Full patient records with history and past prescriptions
- **Dashboard** — Today's patients, total consultations, pending follow-ups at a glance
- **Clinic Branding** — Upload clinic logo and doctor signature for PDF headers
- **Dark Mode** — Toggle between light and dark themes
- **Mobile Friendly** — Responsive design works on desktop, tablet, and phone
- **Secure Auth** — JWT authentication with bcrypt password hashing (HTTP-only cookies)

## Tech Stack

| Layer      | Technology                              |
| ---------- | --------------------------------------- |
| Framework  | Next.js 16 (App Router, Route Handlers) |
| Language   | TypeScript (strict mode)                |
| Styling    | Tailwind CSS v4, shadcn/ui             |
| Database   | MongoDB Atlas via Prisma ORM            |
| Auth       | JWT + bcrypt (HTTP-only cookies)        |
| Forms      | React Hook Form + Zod validation        |
| PDF        | pdf-lib (server-side generation)        |
| QR Code    | qrcode                                  |
| Icons      | Lucide React                            |
| Theme      | next-themes                             |
| Runtime    | Node.js 22+                             |

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 22+** — [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **MongoDB Atlas account** — [Sign up free](https://www.mongodb.com/cloud/atlas/register) (or use a local MongoDB instance)
- **Git** — [Download here](https://git-scm.com/)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Shalmaliiii/QuillRx.git
cd QuillRx
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
# MongoDB Atlas connection string
DATABASE_URL="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/quillrx?retryWrites=true&w=majority"

# JWT secret for authentication (use a strong random string in production)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# App URL (used for generating prescription links and QR codes)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Upload directory for clinic logos and signatures (local dev)
UPLOAD_DIR="./public/uploads"
```

| Variable               | Description                                      | Required |
| ---------------------- | ------------------------------------------------ | -------- |
| `DATABASE_URL`         | MongoDB connection string (Atlas or local)        | Yes      |
| `JWT_SECRET`           | Secret key for signing JWT tokens                 | Yes      |
| `NEXT_PUBLIC_APP_URL`  | Base URL of the app (used in QR codes and links)  | Yes      |
| `UPLOAD_DIR`           | Directory for file uploads (logos, signatures)     | No       |

> **Tip:** To get your MongoDB Atlas connection string, go to your Atlas dashboard → Database → Connect → Drivers → copy the connection string and replace `<username>`, `<password>`, and `<cluster>` with your actual credentials.

### 4. Set Up the Database

Generate the Prisma client (creates type-safe database bindings):

```bash
npx prisma generate
```

Push the schema to your MongoDB database (creates collections and indexes):

```bash
npx prisma db push
```

> **Optional:** To explore your database visually, run:
> ```bash
> npx prisma studio
> ```
> This opens a browser-based GUI at `http://localhost:5555`.

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app will hot-reload as you make changes.

**First-time setup:**
1. Navigate to `/register` and create a doctor account
2. Fill in your professional details (name, qualification, registration number, specialization)
3. Optionally add clinic details (name, address, timings, phone)
4. Log in and start managing patients and prescriptions

---

## Production Build

Build the optimized production bundle:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

The app uses Next.js `standalone` output mode, which produces a minimal self-contained build in `.next/standalone/`.

---

## Docker Deployment

### Docker Compose

The simplest way to run in production. Create a `.env` file with your environment variables, then:

```bash
docker-compose up --build
```

This will:
- Build the multi-stage Docker image (Node.js 22 Alpine)
- Start the app on port `3000`
- Mount a persistent volume for file uploads at `/app/public/uploads`

To run in the background:

```bash
docker-compose up --build -d
```

To stop:

```bash
docker-compose down
```

### Standalone Docker

Build the image:

```bash
docker build -t quillrx .
```

Run the container:

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/quillrx?retryWrites=true&w=majority" \
  -e JWT_SECRET="your-secret-key" \
  -e NEXT_PUBLIC_APP_URL="http://localhost:3000" \
  -v quillrx-uploads:/app/public/uploads \
  quillrx
```

> **Note:** The Dockerfile uses a multi-stage build: dependencies → build → production runtime. The final image runs as a non-root `nextjs` user for security.

---

## Cloud Deployment

### Vercel (Recommended)

```bash
npx vercel deploy
```

Set your environment variables in the [Vercel Dashboard](https://vercel.com/dashboard) → Project Settings → Environment Variables.

> **Important:** Set `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL (e.g., `https://quillrx.vercel.app`).

### Railway / Render

Use the included `Dockerfile` for container deployment:
1. Connect your GitHub repository
2. Set the environment variables (`DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`)
3. Deploy — the platform will auto-detect the Dockerfile

---

## Project Structure

```
QuillRx/
├── prisma/
│   └── schema.prisma            # Database schema (Doctor, Patient, Prescription models)
├── public/
│   └── uploads/                 # Uploaded clinic logos and signatures (gitignored)
├── src/
│   ├── app/
│   │   ├── (dashboard)/         # Authenticated pages (route group)
│   │   │   ├── dashboard/       # Dashboard with stats and recent activity
│   │   │   ├── patients/        # Patient list, detail view, and add new
│   │   │   ├── prescriptions/   # Prescription list, detail view, create new
│   │   │   ├── settings/        # Doctor profile, logo/signature uploads, theme
│   │   │   └── layout.tsx       # Dashboard layout with sidebar and mobile nav
│   │   ├── api/                 # API route handlers
│   │   │   ├── auth/            # POST /register, /login, /logout; GET /me
│   │   │   ├── dashboard/       # GET /api/dashboard (stats)
│   │   │   ├── doctor/          # PUT /api/doctor (profile update)
│   │   │   ├── patients/        # CRUD + GET /search
│   │   │   ├── prescriptions/   # CRUD + GET /:id/pdf
│   │   │   └── upload/          # POST /api/upload (logo/signature)
│   │   ├── login/               # Login page
│   │   ├── register/            # Registration page
│   │   ├── layout.tsx           # Root layout (theme provider, auth context)
│   │   └── page.tsx             # Landing page
│   ├── components/
│   │   ├── layout/              # Sidebar, mobile navigation
│   │   └── ui/                  # shadcn/ui components (button, card, dialog, etc.)
│   ├── contexts/
│   │   └── auth-context.tsx     # React context for auth state (JWT session)
│   ├── lib/
│   │   ├── auth.ts              # JWT helpers, password hashing, cookie management
│   │   ├── db.ts                # Prisma client singleton
│   │   ├── pdf-generator.ts     # Server-side A4 PDF generation with pdf-lib
│   │   ├── upload.ts            # File upload utilities
│   │   ├── utils.ts             # General utilities (cn helper for Tailwind)
│   │   └── validators.ts        # Zod schemas for all form/API validation
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces (Doctor, Patient, Prescription, etc.)
│   └── middleware.ts            # Route protection (redirects unauthenticated users)
├── .env.example                 # Example environment variables
├── docker-compose.yml           # Docker Compose configuration
├── Dockerfile                   # Multi-stage Docker build
├── next.config.ts               # Next.js configuration (standalone output)
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration (strict mode, path aliases)
└── eslint.config.mjs            # ESLint configuration
```

---

## API Routes

| Method | Endpoint                       | Description                     | Auth Required |
| ------ | ------------------------------ | ------------------------------- | ------------- |
| POST   | `/api/auth/register`           | Register a new doctor           | No            |
| POST   | `/api/auth/login`              | Log in and receive JWT cookie   | No            |
| POST   | `/api/auth/logout`             | Clear auth cookie               | No            |
| GET    | `/api/auth/me`                 | Get current doctor profile      | Yes           |
| GET    | `/api/dashboard`               | Dashboard stats                 | Yes           |
| PUT    | `/api/doctor`                  | Update doctor profile           | Yes           |
| GET    | `/api/patients`                | List all patients               | Yes           |
| POST   | `/api/patients`                | Create a new patient            | Yes           |
| GET    | `/api/patients/:id`            | Get patient details             | Yes           |
| PUT    | `/api/patients/:id`            | Update patient                  | Yes           |
| DELETE | `/api/patients/:id`            | Delete patient                  | Yes           |
| GET    | `/api/patients/search?q=...`   | Search patients by name/phone   | Yes           |
| GET    | `/api/prescriptions`           | List all prescriptions          | Yes           |
| POST   | `/api/prescriptions`           | Create a new prescription       | Yes           |
| GET    | `/api/prescriptions/:id`       | Get prescription details        | Yes           |
| GET    | `/api/prescriptions/:id/pdf`   | Download prescription as PDF    | Yes           |
| POST   | `/api/upload`                  | Upload logo or signature image  | Yes           |

---

## App Flow

1. **Register** — Doctor creates an account with professional details (name, qualification, registration number, specialization) and optional clinic details
2. **Login** — Authenticate with email and password; a JWT is stored as an HTTP-only cookie (`quillrx_token`)
3. **Dashboard** — View today's patients, total consultations, pending follow-ups, and recent prescriptions
4. **Add Patient** — Enter patient details (name, age, gender, phone, vitals, allergies, existing conditions)
5. **Create Prescription** — Search for a patient, add medicines with dosage schedule (morning/afternoon/night, before/after food), vitals, diagnosis, lab tests, advice, follow-up date, and fee breakdown
6. **View Prescription** — See the full prescription with options to download PDF, share via WhatsApp, or generate a QR code
7. **Settings** — Update doctor profile, upload clinic logo and digital signature, toggle dark mode

---

## Scripts Reference

| Command           | Description                                    |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | Start development server with hot reload       |
| `npm run build`   | Build optimized production bundle              |
| `npm start`       | Start production server                        |
| `npm run lint`    | Run ESLint checks                              |
| `npx prisma generate` | Generate Prisma client from schema        |
| `npx prisma db push`  | Push schema changes to MongoDB            |
| `npx prisma studio`   | Open Prisma Studio (database GUI)         |

---

## Troubleshooting

### Common Issues

**`prisma generate` fails**
- Ensure you have a valid `DATABASE_URL` in your `.env` file
- Run `npm install` first to ensure `prisma` is in your devDependencies

**Cannot connect to MongoDB**
- Verify your MongoDB Atlas IP whitelist includes your current IP (or use `0.0.0.0/0` for development)
- Double-check the username, password, and cluster name in `DATABASE_URL`
- Ensure the database user has `readWrite` permissions

**Upload directory errors**
- The app stores uploaded logos and signatures in `./public/uploads/` by default
- Ensure this directory exists and is writable: `mkdir -p public/uploads`

**Port 3000 already in use**
- Kill the existing process: `lsof -ti:3000 | xargs kill -9`
- Or use a different port: `PORT=3001 npm run dev`

**Docker build fails on Apple Silicon (M1/M2)**
- Use the `--platform linux/amd64` flag: `docker build --platform linux/amd64 -t quillrx .`

---

## License

MIT
