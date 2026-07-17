# Warangal Zonal WIE Congress 2026

A full-stack event registration website for the IEEE VEC Student Branch, Vaagdevi Engineering College, Warangal.

## Features
- Modern IEEE-themed landing page
- About, Speakers, Schedule, Contact, and registration sections
- Countdown timer and live registration counter
- Registration form with payment proof upload
- Unique registration ID and QR code generation
- Admin login, dashboard, participant management, export, QR attendance scan, and statistics

## Tech Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express.js
- Database: MySQL
- Auth: JWT
- File Upload: Multer
- QR Code: qrcode
- Email: Nodemailer
- Excel Export: xlsx

## Project Structure
```text
client/          # React frontend
server/          # Express backend
uploads/         # Uploaded proof files and QR codes
database.sql     # MySQL schema
README.md
.env.example
```

## Setup
1. Install dependencies:
```bash
npm install
```
2. Create a MySQL database named `warangal_wie`.
3. Import the SQL file in `database.sql`.
4. Copy `.env.example` to `.env` and update credentials.
5. Start the app:
```bash
npm run dev
```

## Admin Access
- Username: `admin`
- Password: `admin123`

## Notes
- Update email credentials for real email delivery.
- Registration closes automatically after 230 participants.
