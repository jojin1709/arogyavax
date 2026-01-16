const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../database');
const router = express.Router();

// Register Route
router.post('/register', (req, res) => {
    const { name, email, password, role, phone, aadhaar } = req.body;

    // Simple validation
    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Please fill all required fields.' });
    }

    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            return res.status(500).json({ error: 'Error hashing password.' });
        }

        const sql = `INSERT INTO users (name, email, password, role, phone, aadhaar) VALUES (?, ?, ?, ?, ?, ?)`;
        const params = [name, email, hash, role, phone, aadhaar];

        db.run(sql, params, function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Email already exists.' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: 'User registered successfully.', userId: this.lastID });
        });
    });
});

// Login Route
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Please provide email and password.' });
    }

    // Hardcoded Admin Login (Requested Feature)
    if (email === 'admin@admin.com' && password === 'admin') {
        return res.json({
            message: 'Admin Login successful.',
            user: { id: 99999, name: 'Super Admin', role: 'admin' }
        });
    }

    const sql = `SELECT * FROM users WHERE email = ?`;

    db.get(sql, [email], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error.' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Error processing password.' });
            }
            if (result) {
                // In a real app, generate a JWT token here. For simple hackathon, returning user details is okay.
                // Or use express-session. For now, returning success.
                res.json({
                    message: 'Login successful.',
                    user: { id: user.id, name: user.name, role: user.role }
                });
            } else {
                res.status(401).json({ error: 'Invalid email or password.' });
            }
        });
    });
});

// Mock OTP Store (In-memory for demo)
const otpStore = {};

// Send OTP Route
router.post('/send-otp', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required.' });

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore[email] = otp;

    // In a real app, use Nodemailer or Twilio here.
    console.log(`[OTP SYSTEM] OTP for ${email} is ${otp}`);

    // For "Free Phone/Email OTP" demo, we just return success and log it.
    // In frontend, we will show it in alert for ease.
    res.json({ message: 'OTP Sent successfully!', otp: otp });
});

module.exports = router;
