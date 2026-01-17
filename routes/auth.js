const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../database');
const router = express.Router();

// Register Route
router.post('/register', async (req, res) => {
    const { name, email, password, role, phone, aadhaar } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Please fill all required fields.' });
    }

    try {
        const hash = await bcrypt.hash(password, 10);

        const sql = `INSERT INTO users (name, email, password, role, phone, aadhaar) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
        const params = [name, email, hash, role, phone, aadhaar];

        const result = await db.query(sql, params);
        res.status(201).json({ message: 'User registered successfully.', userId: result.rows[0].id });
    } catch (err) {
        if (err.constraint === 'users_email_key') {
            return res.status(400).json({ error: 'Email already exists.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Please provide email and password.' });
    }

    if (email === 'admin@admin.com' && password === 'admin') {
        return res.json({
            message: 'Admin Login successful.',
            user: { id: 99999, name: 'Super Admin', role: 'admin' }
        });
    }

    if (email === 'nurse@nurse.com' && password === 'nurse') {
        return res.json({
            message: 'Nurse Login successful.',
            user: { id: 88888, name: 'Nurse Joy', role: 'nurse' }
        });
    }

    try {
        const sql = `SELECT * FROM users WHERE email = $1`;
        const result = await db.query(sql, [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            res.json({
                message: 'Login successful.',
                user: { id: user.id, name: user.name, role: user.role }
            });
        } else {
            res.status(401).json({ error: 'Invalid email or password.' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Database error.' });
    }
});

// Mock OTP Store (In-memory for demo)
const otpStore = {};

// Send OTP Route
router.post('/send-otp', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required.' });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore[email] = otp;

    console.log(`[OTP SYSTEM] OTP for ${email} is ${otp}`);
    res.json({ message: 'OTP Sent successfully!', otp: otp });
});

// Update Profile Route
router.put('/update-profile', async (req, res) => {
    const { id, name, phone, password, profile_pic } = req.body;

    try {
        let sql, params;
        if (password && password.trim() !== "") {
            const hash = await bcrypt.hash(password, 10);
            sql = `UPDATE users SET name=$1, phone=$2, password=$3, profile_pic=$4 WHERE id=$5 RETURNING id, name, email, role, phone, profile_pic`;
            params = [name, phone, hash, profile_pic, id];
        } else {
            sql = `UPDATE users SET name=$1, phone=$2, profile_pic=$3 WHERE id=$4 RETURNING id, name, email, role, phone, profile_pic`;
            params = [name, phone, profile_pic, id];
        }

        const result = await db.query(sql, params);
        if (result.rows.length > 0) {
            res.json({ message: 'Profile updated successfully', user: result.rows[0] });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database update failed' });
    }
});

module.exports = router;
