const express = require('express');
const bcrypt = require('bcrypt');
const { User } = require('../database'); // Import User model from database.js export
const router = express.Router();

// Register Route
router.post('/register', async (req, res) => {
    const { name, email, password, role, phone, aadhaar } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Please fill all required fields.' });
    }

    try {
        const hash = await bcrypt.hash(password, 10);

        // Determine Status: Nurses are pending, others active
        const status = (role === 'nurse') ? 'pending' : 'active';

        // Check for existing user
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists.' });
        }

        const newUser = await User.create({
            name,
            email,
            password: hash,
            role,
            phone,
            aadhaar,
            profile_pic: req.body.profile_pic || null,
            status
        });

        // Custom message for nurses
        if (role === 'nurse') {
            res.status(201).json({ message: 'Registration successful! Please wait for Admin approval to login.', userId: newUser._id });
        } else {
            res.status(201).json({ message: 'User registered successfully.', userId: newUser._id });
        }

    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Please provide email and password.' });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Check for pending approval
        if (user.role === 'nurse' && user.status === 'pending') {
            return res.status(403).json({ error: 'Your account is pending Admin approval.' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            res.json({
                message: 'Login successful.',
                user: { id: user._id, name: user.name, role: user.role }
            });
        } else {
            res.status(401).json({ error: 'Invalid email or password.' });
        }
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Database error. Please try again later.' });
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

// Reset Password Route  
router.post('/reset-password', async (req, res) => {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
        return res.status(400).json({ error: 'Email, OTP and new password required.' });
    }

    // Verify OTP
    if (!otpStore[email] || otpStore[email] !== otp) {
        return res.status(401).json({ error: 'Invalid or expired OTP.' });
    }

    try {
        // Hash new password
        const hash = await bcrypt.hash(password, 10);

        // Update password
        const user = await User.findOneAndUpdate({ email }, { password: hash }, { new: true });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Clear OTP
        delete otpStore[email];

        res.json({ message: 'Password reset successful!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error.' });
    }
});

// Update Profile Route
router.put('/update-profile', async (req, res) => {
    const { id, name, phone, password, profile_pic } = req.body;

    try {
        const updates = { name, phone };
        if (profile_pic) updates.profile_pic = profile_pic;

        if (password && password.trim() !== "") {
            updates.password = await bcrypt.hash(password, 10);
        }

        // Note: For Update, we might need to handle 'id'. ID from frontend might be integer or string.
        // Mongoose findById works with hex strings.
        // If 'id' is "99999" (hardcoded admin), findById might fail if it's not ObjectID.
        // We should search by _id if valid info, or handle legacy IDs.

        let user;
        // Simple check if it's a valid ObjectId
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            user = await User.findByIdAndUpdate(id, updates, { new: true });
        } else {
            // It might be a legacy logic or strictly email based?
            // Let's assume frontend sends the _id we sent in login.
            user = await User.findByIdAndUpdate(id, updates, { new: true });
        }

        if (user) {
            res.json({ message: 'Profile updated successfully', user: { id: user._id, ...user.toObject() } });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database update failed' });
    }
});

module.exports = router;
