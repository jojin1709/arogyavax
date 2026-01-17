const express = require('express');
const db = require('../database');
const router = express.Router();

// Get Patient History
router.get('/user/:id/history', async (req, res) => {
    const userId = req.params.id;
    const sql = `
        SELECT r.id, r.date_administered, r.vaccine_id, 
               v.name as vaccine_name 
        FROM vaccination_records r
        LEFT JOIN vaccines v ON r.vaccine_id = v.id
        WHERE r.patient_id = $1 ORDER BY r.date_administered DESC
    `;

    try {
        const result = await db.query(sql, [userId]);
        const map = { 1: 'BCG', 2: 'Hepatitis B', 3: 'OPV', 4: 'Covaxin', 5: 'Covishield' };

        const history = result.rows.map(r => ({
            ...r,
            vaccine_name: r.vaccine_name || map[r.vaccine_id] || 'Unknown Vaccine',
            hospital_name: 'City General Hospital'
        }));
        res.json({ history });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Stats
router.get('/admin/stats', async (req, res) => {
    try {
        const pCount = await db.query("SELECT COUNT(*) as count FROM users WHERE role='patient'");
        const hCount = await db.query("SELECT COUNT(*) as count FROM hospitals");
        const vCount = await db.query("SELECT COUNT(*) as count FROM vaccination_records WHERE status='administered'");

        res.json({
            patients: pCount.rows[0].count,
            hospitals: hCount.rows[0].count,
            vaccinations: vCount.rows[0].count
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Record Vaccine
router.post('/record-vaccine', async (req, res) => {
    const { identifier, vaccineId, vaccineName } = req.body;

    try {
        const uRes = await db.query("SELECT id, name FROM users WHERE phone = $1 OR aadhaar = $2", [identifier, identifier]);
        const user = uRes.rows[0];

        if (!user) return res.status(404).json({ error: "Patient not found." });

        const date = new Date().toISOString().split('T')[0];
        // Ensure hospital exists with ID 1 for foreign key constraint
        // (In a real app, this would be dynamic)

        // Check if hospital 1 exists, if not insert it
        await db.query(`INSERT INTO hospitals (id, name, location, approved_status) VALUES (1, 'City General', 'City', 1) ON CONFLICT (id) DO NOTHING`);

        const sql = `INSERT INTO vaccination_records (patient_id, vaccine_id, date_administered, hospital_id, status) VALUES ($1, $2, $3, 1, 'administered')`;
        await db.query(sql, [user.id, vaccineId, date]);

        res.json({ message: "Vaccine administered successfully!", patient: user.name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Stock Management
router.get('/stock', async (req, res) => {
    try {
        const sql = `SELECT s.id, v.name as vaccine_name, s.quantity 
                     FROM stock s 
                     LEFT JOIN vaccines v ON s.vaccine_id = v.id`;
        const result = await db.query(sql);
        res.json({ stock: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/stock/add', async (req, res) => {
    const { vaccineName, quantity } = req.body;

    // Ensure hospital 1 exists
    try {
        await db.query(`INSERT INTO hospitals (id, name, location, approved_status) VALUES (1, 'City General', 'City', 1) ON CONFLICT (id) DO NOTHING`);

        // Find Vaccine ID
        let vRes = await db.query("SELECT id FROM vaccines WHERE name = $1", [vaccineName]);
        let vaccineId;

        if (vRes.rows.length === 0) {
            const insertV = await db.query("INSERT INTO vaccines (name) VALUES ($1) RETURNING id", [vaccineName]);
            vaccineId = insertV.rows[0].id;
        } else {
            vaccineId = vRes.rows[0].id;
        }

        // Update Stock for Hospital 1
        const sRes = await db.query("SELECT id, quantity FROM stock WHERE vaccine_id = $1 AND hospital_id = 1", [vaccineId]);

        if (sRes.rows.length > 0) {
            const newQty = sRes.rows[0].quantity + parseInt(quantity);
            await db.query("UPDATE stock SET quantity = $1 WHERE id = $2", [newQty, sRes.rows[0].id]);
        } else {
            await db.query("INSERT INTO stock (hospital_id, vaccine_id, quantity) VALUES (1, $1, $2)", [vaccineId, quantity]);
        }
        res.json({ message: "Stock updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nurse: Search Patients
router.get('/nurse/search-patients', async (req, res) => {
    const { query } = req.query;
    if (!query) return res.json({ patients: [] });

    try {
        const sql = `
            SELECT id, name, email, phone, aadhaar, dob, gender, address 
            FROM users 
            WHERE role = 'patient' AND (
                name ILIKE $1 OR 
                email ILIKE $1 OR 
                phone ILIKE $1 OR 
                aadhaar ILIKE $1
            )
        `;
        const result = await db.query(sql, [`%${query}%`]);
        res.json({ patients: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nurse: Get Patient Details
router.get('/nurse/patient/:id', async (req, res) => {
    try {
        const userRes = await db.query("SELECT id, name, email, phone, aadhaar, dob, gender, address FROM users WHERE id = $1", [req.params.id]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: "Patient not found" });

        const historyRes = await db.query(`
            SELECT r.id, r.date_administered, v.name as vaccine_name, h.name as hospital_name
            FROM vaccination_records r
            LEFT JOIN vaccines v ON r.vaccine_id = v.id
            LEFT JOIN hospitals h ON r.hospital_id = h.id
            WHERE r.patient_id = $1
            ORDER BY r.date_administered DESC
        `, [req.params.id]);

        res.json({
            patient: userRes.rows[0],
            vaccinations: historyRes.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nurse: Update Patient Details
router.put('/nurse/patient/:id', async (req, res) => {
    const { name, phone, aadhaar, dob, gender, address } = req.body;
    try {
        await db.query(
            "UPDATE users SET name=$1, phone=$2, aadhaar=$3, dob=$4, gender=$5, address=$6 WHERE id=$7",
            [name, phone, aadhaar, dob, gender, address, req.params.id]
        );
        res.json({ message: "Patient details updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Helper: Calculate Due Date
function getDueDate(dob, ageDays) {
    const date = new Date(dob);
    date.setDate(date.getDate() + ageDays);
    return date;
}

// Patient Reminders Endpoint
router.get('/patient/:id/reminders', async (req, res) => {
    try {
        const userRes = await db.query("SELECT dob FROM users WHERE id = $1", [req.params.id]);
        if (userRes.rows.length === 0 || !userRes.rows[0].dob) {
            return res.json({ reminders: [] });
        }

        const dob = userRes.rows[0].dob;
        const vaccinesRes = await db.query("SELECT * FROM vaccines");
        const recordsRes = await db.query("SELECT vaccine_id FROM vaccination_records WHERE patient_id = $1", [req.params.id]);

        const takenVaccineIds = new Set(recordsRes.rows.map(r => r.vaccine_id));
        const reminders = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        vaccinesRes.rows.forEach(v => {
            if (takenVaccineIds.has(v.id)) return;

            const dueDate = getDueDate(dob, v.age_required_days);
            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let status = 'upcoming';
            let message = `Upcoming: ${v.name} due on ${dueDate.toLocaleDateString()}`;
            let alertLevel = 'info'; // info, warning, danger, success

            if (diffDays < 0) {
                status = 'overdue';
                message = `OVERDUE: You missed ${v.name}! Due was ${dueDate.toLocaleDateString()}`;
                alertLevel = 'danger';
            } else if (diffDays === 0) {
                status = 'due';
                message = `Due Today: Please get ${v.name}`;
                alertLevel = 'success';
            } else if (diffDays <= 3) {
                status = 'urgent';
                message = `Reminder: ${v.name} due in ${diffDays} days`;
                alertLevel = 'warning';
            } else if (diffDays <= 7) {
                status = 'soon';
                message = `Upcoming: ${v.name} due in ${diffDays} days`;
                alertLevel = 'info';
            } else {
                return; // Too far in future, don't show in immediate reminders
            }

            reminders.push({
                vaccine: v.name,
                dueDate: dueDate.toISOString().split('T')[0],
                status,
                message,
                alertLevel
            });
        });

        // Sort by due date
        reminders.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        res.json({ reminders });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
