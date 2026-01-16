const express = require('express');
const db = require('../database');
const router = express.Router();

// Get Patient Schedule & History
router.get('/user/:id/history', (req, res) => {
    const userId = req.params.id;
    // Join with vaccines table if it exists, else just ID
    /* 
       For MVP: 
       vaccines table: id, name
       records: patient_id, vaccine_id, date, hospital_id
    */
    const sql = `
    SELECT r.id, r.date_administered, r.vaccine_id, 
           v.name as vaccine_name 
    FROM vaccination_records r
    LEFT JOIN vaccines v ON r.vaccine_id = v.id
    WHERE r.patient_id = ? ORDER BY r.date_administered DESC
   `;

    db.all(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Because we didn't seed 'vaccines' table properly with IDs 1,2,3... 
        // let's just map IDs to names manually if name is null
        const map = { 1: 'BCG', 2: 'Hepatitis B', 3: 'OPV' };
        const history = rows.map(r => ({
            ...r,
            vaccine_name: r.vaccine_name || map[r.vaccine_id] || 'Unknown Vaccine',
            hospital_name: 'City General Hospital' // hardcoded for MVP
        }));

        res.json({ history });
    });
});

router.get('/user/:id/schedule', (req, res) => {
    // In a real app, calculate based on DOB.
    // Here we just return dummy or stored records.
    const userId = req.params.id;
    // ... Implementation pending
    res.json({ message: "Schedule endpoint" });
});

// Admin Dashboard Stats
router.get('/admin/stats', (req, res) => {
    db.serialize(() => {
        let stats = {};
        db.get("SELECT COUNT(*) as count FROM users WHERE role='patient'", (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.patients = row.count;

            db.get("SELECT COUNT(*) as count FROM hospitals", (err, row) => {
                stats.hospitals = row.count;

                db.get("SELECT COUNT(*) as count FROM vaccination_records WHERE status='administered'", (err, row) => {
                    stats.vaccinations = row.count;
                    res.json(stats);
                });
            });
        });
    });
});

// Record Vaccination (Nurse)
router.post('/record-vaccine', (req, res) => {
    const { identifier, vaccineId, vaccineName } = req.body;

    // 1. Find User by Phone or Aadhaar
    db.get("SELECT id, name FROM users WHERE phone = ? OR aadhaar = ?", [identifier, identifier], (err, user) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (!user) return res.status(404).json({ error: "Patient not found." });

        // 2. Insert into vaccination_records
        const date = new Date().toISOString().split('T')[0];
        // Dummy hospital ID = 1 for now
        const sql = `INSERT INTO vaccination_records (patient_id, vaccine_id, date_administered, hospital_id, status) VALUES (?, ?, ?, 1, 'administered')`;

        db.run(sql, [user.id, vaccineId, date], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Vaccine administered successfully!", patient: user.name });
        });
    });
});

// --- STOCK MANAGEMENT ---

// Get Stock
router.get('/stock', (req, res) => {
    // Join with vaccines to get names. 
    // Since we didn't seed vaccines properly, we will just store vaccine_name directly in stock or map it.
    // For MVP, let's just assume we store ID and map on client or store name roughly.
    // Actually, let's fix the logic: We'll just return the raw stock table and join if possible.
    const sql = `SELECT s.id, v.name as vaccine_name, s.quantity 
                 FROM stock s 
                 LEFT JOIN vaccines v ON s.vaccine_id = v.id`;

    db.all(sql, [], (err, rows) => {
        // Fallback if rows are empty or joins fail due to empty vaccines table
        if (err) return res.status(500).json({ error: err.message });
        res.json({ stock: rows });
    });
});

// Add Stock
router.post('/stock/add', (req, res) => {
    const { vaccineName, quantity } = req.body;

    // First ensure vaccine exists in 'vaccines' table to get ID
    db.get("SELECT id FROM vaccines WHERE name = ?", [vaccineName], (err, row) => {
        if (!row) {
            // Insert vaccine if not exists (Lazy seeding)
            db.run("INSERT INTO vaccines (name) VALUES (?)", [vaccineName], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                const newId = this.lastID;
                updateStock(newId);
            });
        } else {
            updateStock(row.id);
        }
    });

    function updateStock(vaccineId) {
        // Check if stock entry exists for hospital 1
        db.get("SELECT id, quantity FROM stock WHERE vaccine_id = ? AND hospital_id = 1", [vaccineId], (err, row) => {
            if (row) {
                // Update
                const newQty = row.quantity + parseInt(quantity);
                db.run("UPDATE stock SET quantity = ? WHERE id = ?", [newQty, row.id], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: "Stock updated", newQty });
                });
            } else {
                // Insert
                db.run("INSERT INTO stock (hospital_id, vaccine_id, quantity) VALUES (1, ?, ?)", [vaccineId, quantity], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: "Stock added" });
                });
            }
        });
    }
});

module.exports = router;
