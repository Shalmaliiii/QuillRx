# QuillRx - Online Prescription & Clinic Management

Production-ready web app for a General Physician in India with fast digital prescriptions, patient history, and WhatsApp-friendly delivery.

## Stack
- Next.js + TypeScript + Tailwind CSS + shadcn/ui
- Prisma ORM + MongoDB Atlas
- JWT cookie auth + bcrypt password hashing
- React Hook Form + Zod validations
- PDF generation with `pdf-lib`

## Implemented Features
- Doctor onboarding with clinic profile fields
- Secure login and protected dashboard/patient/prescription routes
- Patient management with fast name/phone search
- Prescription builder with dynamic medicine rows and fee auto-total
- Professional printable PDF generation
- Secure tokenized public prescription route (`/rx/[token]`)
- WhatsApp share using `wa.me`, plus copy-link fallback
- Docker and docker-compose setup

## Quick Start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env file:
   ```bash
   cp .env.example .env
   ```
3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
4. Push schema to MongoDB Atlas:
   ```bash
   npx prisma db push
   ```
5. Run:
   ```bash
   npm run dev
   ```

## Required Environment Variables
- `DATABASE_URL`
- `JWT_SECRET`
- `NEXT_PUBLIC_APP_URL`

## Deployment
- **Vercel**: Configure env vars and deploy as a standard Next.js app.
- **Railway/Render/VPS**: Use `Dockerfile` and set the same env vars.

## Security
- HTTP-only session cookie
- Zod validation across auth/patient/prescription payloads
- Password hashing with bcrypt
- Prisma query safety against injection vectors
