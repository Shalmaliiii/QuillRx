# QuillRx — Digital Prescription & Clinic Management

A modern, production-ready prescription management web app for Indian physicians. Create digital prescriptions, manage patients, generate professional PDFs, and share via WhatsApp — all from a mobile-friendly interface.

## Features

- **Digital Prescriptions** — Create prescriptions with medicines, dosage, vitals, diagnosis, and fees in under 2 minutes
- **Professional PDF Generation** — Auto-generated A4 PDF prescriptions with clinic branding
- **WhatsApp Sharing** — Send prescriptions directly to patients via WhatsApp
- **QR Code** — Generate QR codes for easy prescription access
- **Patient Management** — Full patient records with history and past prescriptions
- **Dashboard** — Today's patients, total consultations, pending follow-ups at a glance
- **Clinic Branding** — Upload clinic logo and doctor signature
- **Dark Mode** — Toggle between light and dark themes
- **Mobile Friendly** — Responsive design works on desktop, tablet, and phone
- **Secure Auth** — JWT authentication with bcrypt password hashing

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui |
| Backend | Next.js API Routes (Route Handlers) |
| Database | MongoDB Atlas via Prisma ORM |
| Auth | JWT + bcrypt |
| Forms | React Hook Form + Zod validation |
| PDF | pdf-lib |
| Icons | Lucide React |
| Theme | next-themes |

## Getting Started

### Prerequisites

- Node.js 22+
- MongoDB Atlas account (or local MongoDB)
- npm

### Installation

```bash
git clone https://github.com/Shalmaliiii/QuillRx.git
cd QuillRx
npm install
```

### Environment Setup

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `NEXT_PUBLIC_APP_URL` | App URL (default: `http://localhost:3000`) |
| `UPLOAD_DIR` | File upload directory (default: `./public/uploads`) |

### Database Setup

Generate the Prisma client:

```bash
npx prisma generate
```

Push the schema to your database:

```bash
npx prisma db push
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Docker

### Build and run with Docker Compose:

```bash
docker-compose up --build
```

### Or build standalone:

```bash
docker build -t quillrx .
docker run -p 3000:3000 \
  -e DATABASE_URL="your-mongodb-url" \
  -e JWT_SECRET="your-secret" \
  quillrx
```

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Authenticated pages
│   │   ├── dashboard/        # Dashboard with stats
│   │   ├── patients/         # Patient CRUD and search
│   │   ├── prescriptions/    # Prescription create/view/list
│   │   └── settings/         # Doctor profile and uploads
│   ├── api/                  # API route handlers
│   │   ├── auth/             # Register, login, session
│   │   ├── dashboard/        # Dashboard stats
│   │   ├── doctor/           # Profile update
│   │   ├── patients/         # Patient CRUD + search
│   │   ├── prescriptions/    # Prescription CRUD + PDF
│   │   └── upload/           # File uploads
│   ├── login/                # Login page
│   ├── register/             # Registration page
│   └── page.tsx              # Landing page
├── components/
│   ├── layout/               # Sidebar, mobile nav
│   └── ui/                   # shadcn/ui components
├── contexts/                 # Auth context provider
├── lib/                      # Auth, DB, PDF, validators, uploads
├── types/                    # TypeScript interfaces
└── middleware.ts              # Route protection
```

## App Flow

1. **Register** — Doctor creates account with professional + clinic details
2. **Dashboard** — View today's stats, recent prescriptions, quick actions
3. **Add Patient** — Enter patient details (name, age, phone, vitals, allergies)
4. **Create Prescription** — Search patient, add medicines/vitals/diagnosis/fees
5. **View Prescription** — See full prescription with PDF download, WhatsApp share, QR code
6. **Settings** — Update profile, upload logo/signature, toggle dark mode

## Deployment

### Vercel (Recommended for Frontend)

```bash
vercel deploy
```

Set environment variables in the Vercel dashboard.

### Railway / Render (Backend + DB)

Use the included `Dockerfile` for container deployment. Set the same environment variables in your hosting provider's dashboard.

## License

MIT
