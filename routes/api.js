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

// List Hospitals
router.get('/admin/hospitals', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM hospitals ORDER BY id DESC");
        res.json({ hospitals: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Hospital
router.post('/admin/hospital', async (req, res) => {
    const { name, location } = req.body;
    try {
        await db.query("INSERT INTO hospitals (name, location, approved_status) VALUES ($1, $2, 1)", [name, location]);
        res.json({ message: "Hospital added successfully!" });
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
            SELECT r.id, r.date_administered, r.certificate_issued, v.name as vaccine_name, h.name as hospital_name
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

// --- NURSE & AUTOMATION ENDPOINTS ---

// Nurse Stats
router.get('/nurse/stats', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const totalAppts = await db.query("SELECT COUNT(*) as count FROM appointments WHERE appointment_date = $1", [today]);
        const completed = await db.query("SELECT COUNT(*) as count FROM appointments WHERE appointment_date = $1 AND status = 'completed'", [today]);
        const pending = await db.query("SELECT COUNT(*) as count FROM appointments WHERE appointment_date = $1 AND status = 'scheduled'", [today]);

        // Mock Overdue calculation for stats (count of overdue vaccines roughly)
        // In real app, complex query. Here, we just count records with 'missed' if we had that, or return mock.
        // Let's return 0 for now or implement a heavy query if needed.
        const overdue = 5; // Mock for now

        res.json({
            today: totalAppts.rows[0].count,
            completed: completed.rows[0].count,
            pending: pending.rows[0].count,
            overdue: overdue
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Appointments CRUD
router.get('/nurse/appointments', async (req, res) => {
    const { date } = req.query; // YYYY-MM-DD
    if (!date) return res.json({ appointments: [] });
    try {
        const sql = `
            SELECT a.id, a.appointment_time, a.status, u.name as patient_name, u.phone, v.name as vaccine_name
            FROM appointments a
            JOIN users u ON a.patient_id = u.id
            LEFT JOIN vaccines v ON a.vaccine_id = v.id
            WHERE a.appointment_date = $1
            ORDER BY a.appointment_time ASC
        `;
        const result = await db.query(sql, [date]);
        res.json({ appointments: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/nurse/appointment', async (req, res) => {
    const { patientId, vaccineId, date, time } = req.body;
    try {
        // Hospital ID hardcoded to 1 for demo
        await db.query(
            "INSERT INTO appointments (patient_id, hospital_id, vaccine_id, appointment_date, appointment_time, status) VALUES ($1, 1, $2, $3, $4, 'scheduled')",
            [patientId, vaccineId, date, time]
        );
        res.json({ message: "Appointment Scheduled" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/nurse/check-in/:id', async (req, res) => {
    try {
        await db.query("UPDATE appointments SET status = 'checked-in' WHERE id = $1", [req.params.id]);
        res.json({ message: "Patient Checked-In" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Batch Reminders (Mock)
router.post('/admin/batch-reminders', async (req, res) => {
    // Logic: fetch all patients, calc due dates, send email if due <= 7 days
    try {
        const users = await db.query("SELECT id, email, name FROM users WHERE role = 'patient'");
        let count = 0;
        // Mock sending
        users.rows.forEach(u => {
            // In real app: calculate due dates here.
            // We'll just simulate sending to 20% of users
            if (Math.random() > 0.8) {
                console.log(`[Email Service] Sending reminder to ${u.email}`);
                count++;
            }
        });
        res.json({ message: `Sent reminders to ${count} patients.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Overdue Reports
router.get('/admin/reports/overdue', async (req, res) => {
    try {
        // Mock response for report
        const report = [
            { name: 'John Doe', vaccine: 'Polio', days_overdue: 15, phone: '1234567890' },
            { name: 'Jane Smith', vaccine: 'Hep B', days_overdue: 45, phone: '0987654321' }
        ];
        res.json({ report });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/nurse/due-list', async (req, res) => {
    // Mock logic for "Children due this week/month"
    // Real logic would query users + vaccines calculation
    res.json({
        dueList: [
            { name: 'Baby A', age: '6 Weeks', vaccine: 'Pentavalent 1', contact: 'Parent A (9999999999)' },
            { name: 'Baby B', age: '10 Weeks', vaccine: 'Pentavalent 2', contact: 'Parent B (8888888888)' }
        ]
    });
});

// Issue Certificate (Nurse)
router.post('/nurse/issue-certificate', async (req, res) => {
    const { recordId } = req.body;
    try {
        await db.query("UPDATE vaccination_records SET certificate_issued = TRUE WHERE id = $1", [recordId]);
        res.json({ message: "Certificate Issued Successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Certificates (Patient)
router.get('/patient/:id/certificates', async (req, res) => {
    try {
        const sql = `
            SELECT r.id, r.date_administered, v.name as vaccine_name, h.name as hospital_name
            FROM vaccination_records r
            JOIN vaccines v ON r.vaccine_id = v.id
            JOIN hospitals h ON r.hospital_id = h.id
            WHERE r.patient_id = $1 AND r.certificate_issued = TRUE
        `;
        const result = await db.query(sql, [req.params.id]);
        res.json({ certificates: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
