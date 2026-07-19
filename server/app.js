import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import xlsx from 'xlsx';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');
const storeFile = path.join(dataDir, 'store.json');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const app = express();
const PORT = process.env.PORT || 5000;
let pool = null;
let dbMode = 'mysql';
let store = { admins: [], registrations: [], attendance: [] };

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

const upload = multer({ dest: uploadDir });

function loadStore() {
  if (fs.existsSync(storeFile)) {
    try {
      store = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
    } catch {
      store = { admins: [], registrations: [], attendance: [] };
    }
  }
  if (!store.admins || !Array.isArray(store.admins)) store.admins = [];
  if (!store.registrations || !Array.isArray(store.registrations)) store.registrations = [];
  if (!store.attendance || !Array.isArray(store.attendance)) store.attendance = [];
}

function saveStore() {
  fs.writeFileSync(storeFile, JSON.stringify(store, null, 2));
}

function seedFallbackData() {
  if (store.admins.length === 0) {
    store.admins.push({ id: 1, username: 'admin', password: bcrypt.hashSync('admin123', 10) });
  }
  saveStore();
}

async function initDB() {
  loadStore();
  seedFallbackData();

  try {
    pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 4000,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,

  ssl: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true
  }
});
   

    const connection = await pool.getConnection();
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        registration_id VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        college_name VARCHAR(255) NOT NULL,
        branch VARCHAR(100) NOT NULL,
        year VARCHAR(20) NOT NULL,
        gender VARCHAR(20) NOT NULL,
        ieee_member TINYINT(1) DEFAULT 0,
        ieee_membership_number VARCHAR(100),
        registration_fee DECIMAL(10,2) NOT NULL,
        transaction_id VARCHAR(100) NOT NULL,
        payment_proof VARCHAR(255),
        qr_code VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        registration_id VARCHAR(50) NOT NULL,
        scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM admins');
    if (rows[0].count === 0) {
      const hashed = bcrypt.hashSync('admin123', 10);
      await connection.execute('INSERT INTO admins (username, password) VALUES (?, ?)', ['admin', hashed]);
    }
    connection.release();
    dbMode = 'mysql';
    console.log('Connected to MySQL');
  } catch (error) {
    dbMode = 'fallback';
    console.warn('MySQL unavailable. Using local fallback store.', error.message);
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token missing' });
  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (dbMode === 'mysql' && pool) {
    const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
    const admin = rows[0];
    const valid = bcrypt.compareSync(password, admin.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: admin.id, username: admin.username }, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
    return res.json({ token });
  }

  const admin = store.admins.find((entry) => entry.username === username);
  if (!admin) return res.status(401).json({ message: 'Invalid credentials' });
  const valid = bcrypt.compareSync(password, admin.password);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: admin.id, username: admin.username }, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
  return res.json({ token });
});

app.get('/api/registrations/count', (req, res) => {
  if (dbMode === 'mysql' && pool) {
    pool.query('SELECT COUNT(*) as count FROM registrations').then(([rows]) => {
      res.json({ count: rows[0].count });
    }).catch(() => res.json({ count: store.registrations.length }));
    return;
  }
  res.json({ count: store.registrations.length });
});

app.post('/api/registrations', upload.single('paymentProof'), async (req, res) => {
  if (dbMode === 'mysql' && pool) {
    const [countRows] = await pool.query('SELECT COUNT(*) as count FROM registrations');
    if (countRows[0].count >= 230) return res.status(400).json({ message: 'Registration closed. All slots are full.' });
  } else if (store.registrations.length >= 230) {
    return res.status(400).json({ message: 'Registration closed. All slots are full.' });
  }

  const regId = `WIE-${uuidv4().slice(0, 8).toUpperCase()}`;
  const fee = req.body.ieeeMember === 'Yes' ? 199 : 299;
  const fileName = req.file ? req.file.filename : null;
  const qrData = `Registration ID: ${regId}\nName: ${req.body.fullName}`;
  const qrPath = path.join(uploadDir, `${regId}.png`);
  await QRCode.toFile(qrPath, qrData);

  if (dbMode === 'mysql' && pool) {
    await pool.execute(
      `INSERT INTO registrations (registration_id, full_name, phone_number, email, college_name, branch, year, gender, ieee_member, ieee_membership_number, registration_fee, transaction_id, payment_proof, qr_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [regId, req.body.fullName, req.body.phoneNumber, req.body.email, req.body.collegeName, req.body.branch, req.body.year, req.body.gender, req.body.ieeeMember === 'Yes' ? 1 : 0, req.body.ieeeMembershipNumber || null, fee, req.body.transactionId, fileName, `${regId}.png`]
    );
  } else {
    const entry = {
      id: Date.now(),
      registration_id: regId,
      full_name: req.body.fullName,
      phone_number: req.body.phoneNumber,
      email: req.body.email,
      college_name: req.body.collegeName,
      branch: req.body.branch,
      year: req.body.year,
      gender: req.body.gender,
      ieee_member: req.body.ieeeMember === 'Yes' ? 1 : 0,
      ieee_membership_number: req.body.ieeeMembershipNumber || null,
      registration_fee: fee,
      transaction_id: req.body.transactionId,
      payment_proof: fileName,
      qr_code: `${regId}.png`,
      created_at: new Date().toISOString()
    };
    store.registrations.push(entry);
    saveStore();
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER || 'your_email@gmail.com', pass: process.env.EMAIL_PASS || 'your_app_password' }
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'your_email@gmail.com',
      to: req.body.email,
      subject: 'Warangal Zonal WIE Congress 2026 - Registration Confirmed',
      html: `<p>Hello ${req.body.fullName},</p><p>Your registration is confirmed.</p><p>Registration ID: <strong>${regId}</strong></p><p>Fee Paid: ₹${fee}</p>`
    });
  } catch (emailError) {
    console.error(emailError);
  }

  res.json({ message: `Registration successful. Your Registration ID is ${regId}`, registrationId: regId, passUrl: `/api/registrations/${regId}/pass`, qrCodeUrl: `/uploads/${regId}.png` });
});

app.get('/api/registrations/:registrationId/pass', (req, res) => {
  const { registrationId } = req.params;
  const passContent = `Warangal Zonal WIE Congress 2026\nRegistration ID: ${registrationId}\nVenue: Vaagdevi Engineering College, Warangal\nDate: 15 Dec 2026`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=${registrationId}-pass.txt`);
  res.send(passContent);
});

app.get('/api/admin/registrations', authenticateToken, async (req, res) => {
  if (dbMode === 'mysql' && pool) {
    const [rows] = await pool.query('SELECT * FROM registrations ORDER BY created_at DESC');
    return res.json(rows);
  }
  return res.json(store.registrations.slice().reverse());
});

app.put('/api/admin/registrations/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  if (dbMode === 'mysql' && pool) {
    const fields = ['full_name', 'phone_number', 'email', 'college_name', 'branch', 'year', 'gender'];
    const updates = [];
    const values = [];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ message: 'No valid fields provided' });
    values.push(id);
    await pool.execute(`UPDATE registrations SET ${updates.join(', ')} WHERE id = ?`, values);
    return res.json({ message: 'Updated' });
  }

  const registration = store.registrations.find((entry) => entry.id === Number(id));
  if (!registration) return res.status(404).json({ message: 'Registration not found' });
  Object.assign(registration, req.body);
  saveStore();
  return res.json({ message: 'Updated' });
});

app.delete('/api/admin/registrations/:id', authenticateToken, async (req, res) => {
  if (dbMode === 'mysql' && pool) {
    await pool.execute('DELETE FROM registrations WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Deleted' });
  }
  store.registrations = store.registrations.filter((entry) => entry.id !== Number(req.params.id));
  saveStore();
  return res.json({ message: 'Deleted' });
});

app.get('/api/admin/registrations/export', authenticateToken, async (req, res) => {
  const rows = dbMode === 'mysql' && pool ? (await pool.query('SELECT * FROM registrations ORDER BY created_at DESC'))[0] : store.registrations.slice().reverse();
  const worksheet = xlsx.utils.json_to_sheet(rows);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Registrations');
  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=registrations.xlsx');
  res.send(buffer);
});

app.post('/api/admin/attendance/scan', authenticateToken, async (req, res) => {
  const { registrationId } = req.body;
  if (dbMode === 'mysql' && pool) {
    const [rows] = await pool.query('SELECT * FROM registrations WHERE registration_id = ?', [registrationId]);
    if (rows.length === 0) return res.status(404).json({ message: 'Registration ID not found' });
    await pool.execute('INSERT INTO attendance (registration_id) VALUES (?)', [registrationId]);
    return res.json({ success: true, participant: rows[0] });
  }
  const participant = store.registrations.find((entry) => entry.registration_id === registrationId);
  if (!participant) return res.status(404).json({ message: 'Registration ID not found' });
  store.attendance.push({ registration_id: registrationId });
  saveStore();
  return res.json({ success: true, participant });
});

app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  if (dbMode === 'mysql' && pool) {
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM registrations');
    const [revenueResult] = await pool.query('SELECT SUM(registration_fee) as revenue FROM registrations');
    const [ieeeResult] = await pool.query('SELECT COUNT(*) as IEEE FROM registrations WHERE ieee_member = 1');
    const [attendanceResult] = await pool.query('SELECT COUNT(*) as checkedIn FROM attendance');
    return res.json({ total: countResult[0].total, revenue: revenueResult[0].revenue || 0, ieee: ieeeResult[0].IEEE, checkedIn: attendanceResult[0].checkedIn });
  }

  const total = store.registrations.length;
  const revenue = store.registrations.reduce((sum, entry) => sum + Number(entry.registration_fee || 0), 0);
  const ieee = store.registrations.filter((entry) => entry.ieee_member === 1 || entry.ieee_member === true).length;
  res.json({ total, revenue, ieee, checkedIn: store.attendance.length });
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}).catch((error) => {
  console.error(error);
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
});
