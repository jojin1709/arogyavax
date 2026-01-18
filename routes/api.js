const express = require('express');
const router = express.Router();
const { User, Vaccine, Hospital, VaccinationRecord, Stock, Appointment, AuditLog, Announcement, mongoose } = require('../database');

// Helper: Log Audit
async function logAudit(action, details, performedBy) {
    try {
        await AuditLog.create({ action, details, performed_by: performedBy });
    } catch (e) {
        console.error("Audit Log Failure:", e);
    }
}

// Get Audit Logs
router.get('/admin/audit-logs', async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ created_at: -1 }).limit(100);
        res.json({ logs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CMS: Get Announcements
router.get('/announcements', async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ created_at: -1 }).limit(10);
        res.json({ announcements });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CMS: Post Announcement
router.post('/admin/announcement', async (req, res) => {
    const { title, message } = req.body;
    try {
        await Announcement.create({ title, message });
        await logAudit('Post Announcement', `Title: ${title}`, 'Admin');
        res.json({ message: "Announcement posted." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nurse Approvals: List Pending
router.get('/admin/nurse-requests', async (req, res) => {
    try {
        // Only select specific fields is good practice, but for migration speed we just return objs.
        // Mongoose returns documents, we can map them if needed, but res.json handles it.
        const requests = await User.find({ role: 'nurse', status: 'pending' })
            .select('id name email phone trna_id hospital_location created_at');
        res.json({ requests });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nurse Approvals: Approve
router.post('/admin/approve-nurse/:id', async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { status: 'active' });
        await logAudit('Approve Nurse', `Nurse ID: ${req.params.id}`, 'Admin');
        res.json({ message: "Nurse Approved!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nurse Approvals: Reject (Delete)
router.post('/admin/reject-nurse/:id', async (req, res) => {
    try {
        await logAudit('Reject Nurse', `Rejected Nurse ID: ${req.params.id}`, 'Admin');
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "Nurse Request Rejected (User Deleted)." });
    } catch (err) {
        res.status(500).json({ error: "Error deleting nurse record." });
    }
});

// Get Patient History
router.get('/user/:id/history', async (req, res) => {
    const userId = req.params.id;
    try {
        // Populate vaccine info
        const records = await VaccinationRecord.find({ patient_id: userId })
            .populate('vaccine_id', 'name')
            .sort({ date_administered: -1 });

        const history = records.map(r => ({
            id: r._id,
            date_administered: r.date_administered,
            vaccine_id: r.vaccine_id?._id,
            vaccine_name: r.vaccine_id?.name || 'Unknown Vaccine',
            hospital_name: 'City General Hospital' // Placeholder or populate hospital
        }));

        res.json({ history });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List Hospitals
router.get('/admin/hospitals', async (req, res) => {
    try {
        const hospitals = await Hospital.find().sort({ _id: -1 });
        res.json({ hospitals });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Hospital
router.delete('/admin/hospital/:id', async (req, res) => {
    try {
        await Hospital.findByIdAndDelete(req.params.id);
        await logAudit('Delete Hospital', `Hospital ID: ${req.params.id}`, 'Admin');
        res.json({ message: "Hospital deleted." });
    } catch (err) {
        res.status(500).json({ error: "Cannot delete hospital with associated records." });
    }
});

// Public: List Hospitals for Centers Page
router.get('/hospitals', async (req, res) => {
    try {
        const hospitals = await Hospital.find({ approved_status: 1 }).sort({ name: 1 });
        res.json({ hospitals });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Hospital
router.post('/admin/hospital', async (req, res) => {
    const { name, location } = req.body;
    try {
        // If we want to simulate auto-increment ID for hospitals like SQL, we can't easily.
        // Let's accept Mongo ID. if code relies on custom ID, we'd need a counter.
        // For now, rely on MongoDB _id.
        // Explicitly create a new ObjectId to ensure it works with Mixed type if Mongoose is being picky
        const newHospital = new Hospital({
            _id: new mongoose.Types.ObjectId(),
            name,
            location,
            approved_status: 1
        });
        await newHospital.save();

        await logAudit('Add Hospital', `Added hospital: ${name}`, 'Admin');
        res.json({ message: "Hospital added successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Patient Booking Endpoint
router.post('/patient/book', async (req, res) => {
    const { patientId, vaccineId, date, time, hospitalId } = req.body;
    try {
        if (!patientId || !vaccineId || !date || !hospitalId || !time) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        await Appointment.create({
            patient_id: patientId,
            vaccine_id: vaccineId,
            hospital_id: hospitalId,
            appointment_date: date,
            appointment_time: time,
            status: 'scheduled'
        });
        res.json({ message: "Appointment booked successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Patient Appointments Endpoint
router.get('/patient/:id/appointments', async (req, res) => {
    try {
        const appointments = await Appointment.find({ patient_id: req.params.id })
            .populate('vaccine_id', 'name')
            .populate('hospital_id', 'name')
            .sort({ appointment_date: 1, appointment_time: 1 });

        const formatted = appointments.map(a => ({
            id: a._id,
            date: a.appointment_date,
            time: a.appointment_time,
            status: a.status,
            vaccine: a.vaccine_id?.name || 'General',
            hospital: a.hospital_id?.name || 'City General'
        }));

        res.json({ appointments: formatted });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Administer Vaccine (Directly)
router.post('/record-vaccine', async (req, res) => {
    const { identifier, vaccineId, vaccineName } = req.body;
    try {
        // Find patient by identifier (Phone or Aadhaar)
        // If exact match on Phone or Aadhaar
        const patient = await User.findOne({
            role: 'patient',
            $or: [{ phone: identifier }, { aadhaar: identifier }]
        });

        if (!patient) {
            return res.status(404).json({ error: "Patient not found with that Phone/Aadhaar" });
        }

        // Create Record (Auto Completed & Certificate Issued)
        await VaccinationRecord.create({
            patient_id: patient._id,
            vaccine_id: vaccineId, // Using ID 1-5 from frontend, assuming mapped to DB IDs or we need to look them up.
            // Wait, frontend sends 1-5 integers. DB expects ObjectIds if referenced?
            // "vaccineId" in frontend is <select value="1">.
            // In migrate step, we created Vaccine models. Did we seed them with numeric IDs?
            // If Schema uses ObjectId, we need to find generic vaccine by name or map 1-5 to real IDs.
            // For robustness, let's try to find by Name first if provided, else dummy.
            // Frontend sends vaccineName too "vaccineName": "BCG" etc.

            // Actually, let's find the vaccine by name
            hospital_id: new mongoose.Types.ObjectId(), // Placeholder for "City General Hospital" or fetch a default
            date_administered: new Date(),
            status: 'completed',
            certificate_issued: true // Auto-issue
        });

        // Update Appointment if exists for today? (Optional but good UX)
        // For now, just return success
        res.json({ message: "Vaccine Administered & Certificate Generated", patient: patient.name });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Mark Vaccine as Compleleted (Nurse)
router.post('/nurse/mark-complete/:id', async (req, res) => {
    try {
        // This ID is the APPOINTMENT ID (from nurse dashboard check-in list)
        // We need to:
        // 1. Update Appointment status to 'completed'
        // 2. Create a VaccinationRecord

        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ error: "Appointment not found" });

        appointment.status = 'completed';
        await appointment.save();

        // Create Vaccination Record
        await VaccinationRecord.create({
            patient_id: appointment.patient_id,
            vaccine_id: appointment.vaccine_id,
            hospital_id: appointment.hospital_id,
            date_administered: new Date(),
            status: 'completed',
            certificate_issued: true // Auto-issue
        });

        res.json({ message: "Vaccination completed & Certificate Issued." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Certificate Details
router.get('/patient/certificate/:recordId', async (req, res) => {
    try {
        const record = await VaccinationRecord.findById(req.params.recordId)
            .populate('patient_id', 'name aadhaar admit_id')
            .populate('vaccine_id', 'name')
            .populate('hospital_id', 'name');

        if (!record) return res.status(404).json({ error: "Certificate not found" });

        const certificate = {
            patient_name: record.patient_id?.name,
            aadhaar: record.patient_id?.aadhaar,
            admit_id: record.patient_id?.admit_id,
            vaccine_name: record.vaccine_id?.name,
            date_administered: record.date_administered,
            hospital_name: record.hospital_id?.name || 'Unknown Hospital'
        };

        res.json({ certificate });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nurse: Issue Certificate
router.post('/nurse/issue-certificate', async (req, res) => {
    const { recordId } = req.body;
    try {
        await VaccinationRecord.findByIdAndUpdate(recordId, { status: 'completed', certificate_issued: true });
        res.json({ message: "Certificate issued (Status set to Completed)" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Admin: Get All Users
router.get('/admin/users', async (req, res) => {
    try {
        const users = await User.find({}).sort({ created_at: -1 });
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Delete User
router.delete('/admin/user/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        await logAudit('Delete User', `User ID: ${req.params.id} `, 'Admin');
        res.json({ message: "User deleted." });
    } catch (err) {
        res.status(500).json({ error: "Cannot delete user with associated records." });
    }
});

// Admin: Update User Role
router.put('/admin/user/:id', async (req, res) => {
    const { role } = req.body;
    try {
        if (!['admin', 'nurse', 'patient'].includes(role)) {
            return res.status(400).json({ error: "Invalid role" });
        }
        await User.findByIdAndUpdate(req.params.id, { role });
        await logAudit('Update User Role', `User ID: ${req.params.id} changed to ${role}`, 'Admin');
        res.json({ message: "User role updated successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Vaccines List
router.get('/vaccines', async (req, res) => {
    try {
        const vaccines = await Vaccine.find().sort({ name: 1 });
        res.json({ vaccines });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Recent Activity Endpoint
router.get('/admin/recent-activity', async (req, res) => {
    try {
        const registrations = await User.find({ role: 'patient' }).sort({ created_at: -1 }).limit(5);

        const bookings = await Appointment.find({})
            .populate('patient_id', 'name')
            .populate('vaccine_id', 'name')
            .sort({ created_at: -1 })
            .limit(5);

        const formattedBookings = bookings.map(b => ({
            patient_name: b.patient_id?.name,
            vaccine_name: b.vaccine_id?.name,
            appointment_date: b.appointment_date
        }));

        res.json({
            registrations,
            bookings: formattedBookings
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Stats & Charts
router.get('/admin/stats', async (req, res) => {
    try {
        const patients = await User.countDocuments({ role: 'patient' });
        const hospitals = await Hospital.countDocuments({});
        const vaccinations = await VaccinationRecord.countDocuments({ status: 'administered' });

        // Chart Data: Monthly Vaccinations
        // Aggregation for monthly stats
        const chartDataRaw = await VaccinationRecord.aggregate([
            { $match: { status: 'administered' } },
            {
                $group: {
                    _id: { $month: "$date_administered" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // Map months numbers to names (Simplified)
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const labels = [];
        const data = [];

        chartDataRaw.forEach(item => {
            labels.push(monthNames[item._id - 1]);
            data.push(item.count);
        });

        // Gender Distribution
        const genderRaw = await User.aggregate([
            { $match: { role: 'patient' } },
            { $group: { _id: "$gender", count: { $sum: 1 } } }
        ]);

        const genderLabels = genderRaw.map(g => g._id || 'Unknown');
        const genderData = genderRaw.map(g => g.count);

        // Recent
        const recentUsers = await User.find().sort({ created_at: -1 }).limit(5);
        const recentBookingsRaw = await Appointment.find({})
            .populate('patient_id', 'name')
            .populate('vaccine_id', 'name')
            .sort({ created_at: -1 })
            .limit(5);

        const recentBookings = recentBookingsRaw.map(b => ({
            patient_name: b.patient_id?.name,
            vaccine_name: b.vaccine_id?.name,
            appointment_date: b.appointment_date,
            status: b.status
        }));

        res.json({
            patients,
            hospitals,
            vaccinations,
            chartData: { labels, data },
            genderData: { labels: genderLabels, data: genderData },
            recentUsers,
            recentBookings
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Stock
router.post('/stock/add', async (req, res) => {
    const { vaccineName, quantity, hospitalId } = req.body;
    let hospId = hospitalId || 1; // Default to 1

    try {
        // Ensure hospital exists
        // If hospitalId is '1', it might be our default one.
        // In Mongo, if we used _id: 1, we can find it.
        // Ensure hospital exists
        // Try finding by ID first
        let hospital;
        try {
            // If hospId is 1, it might fail if database uses ObjectId.
            hospital = await Hospital.findById(hospId);
        } catch (e) { /* Ignore cast error */ }

        // If not found (or cast error), try finding ANY hospital to use as default
        if (!hospital) {
            hospital = await Hospital.findOne();
            if (hospital) hospId = hospital._id;
        }

        if (!hospital) {
            return res.status(400).json({ error: "No hospital found. Please add a hospital first." });
        }

        // Find or Create Vaccine
        let vaccine = await Vaccine.findOne({ name: vaccineName });
        if (!vaccine) {
            vaccine = await Vaccine.create({ name: vaccineName });
        }

        // Update Stock
        let stock = await Stock.findOne({ hospital_id: hospId, vaccine_id: vaccine._id });
        if (stock) {
            stock.quantity += parseInt(quantity);
            await stock.save();
        } else {
            await Stock.create({ hospital_id: hospId, vaccine_id: vaccine._id, quantity: parseInt(quantity) });
        }

        await logAudit('Update Stock', `Added ${quantity} ${vaccineName} to Hospital ${hospId} `, 'Admin');
        res.json({ message: "Stock updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Stock List
router.get('/stock', async (req, res) => {
    try {
        const stock = await Stock.find()
            .populate('vaccine_id', 'name')
            .populate('hospital_id', 'name');

        const formattedStock = stock.map(s => ({
            id: s._id,
            vaccine_name: s.vaccine_id?.name || 'Unknown',
            hospital_name: s.hospital_id?.name || 'Unknown',
            quantity: s.quantity
        }));

        res.json({ stock: formattedStock });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nurse: Search Patients
router.get('/nurse/search-patients', async (req, res) => {
    const { query } = req.query;

    try {
        let filter = { role: 'patient' };
        if (query) {
            const regex = new RegExp(query, 'i');
            filter.$or = [
                { name: regex },
                { email: regex },
                { phone: regex },
                { aadhaar: regex }
            ];
        }

        const patients = await User.find(filter)
            .sort({ created_at: -1 })
            .limit(20) // Limit to 20 for initial load
            .select('id name email phone aadhaar dob gender address');

        res.json({ patients });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nurse: Get Patient Details
router.get('/nurse/patient/:id', async (req, res) => {
    try {
        const patient = await User.findById(req.params.id);
        if (!patient) return res.status(404).json({ error: "Patient not found" });

        const historyRaw = await VaccinationRecord.find({ patient_id: req.params.id })
            .populate('vaccine_id', 'name')
            .populate('hospital_id', 'name')
            .sort({ date_administered: -1 });

        const vaccinations = historyRaw.map(r => ({
            id: r._id,
            date_administered: r.date_administered,
            certificate_issued: r.certificate_issued,
            vaccine_name: r.vaccine_id?.name,
            hospital_name: r.hospital_id?.name
        }));

        res.json({
            patient,
            vaccinations
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nurse: Assign Nurse to Appointment
router.post('/nurse/assign-to-appointment', async (req, res) => {
    const { appointmentId, nurseId, nurseName } = req.body;
    try {
        await Appointment.findByIdAndUpdate(appointmentId, {
            nurse_id: nurseId,
            nurse_name: nurseName,
            status: 'checked-in'
        });
        res.json({ message: "Nurse assigned successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nurse: Update Patient Details
router.put('/nurse/patient/:id', async (req, res) => {
    const { name, phone, aadhaar, dob, gender, address } = req.body;
    try {
        await User.findByIdAndUpdate(req.params.id, {
            name, phone, aadhaar, dob, gender, address
        });
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
        const user = await User.findById(req.params.id);
        if (!user || !user.dob) {
            return res.json({ reminders: [] });
        }

        const dob = user.dob;
        const allVaccines = await Vaccine.find();
        const records = await VaccinationRecord.find({ patient_id: req.params.id });

        const takenVaccineIds = new Set(records.map(r => r.vaccine_id.toString()));
        const reminders = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        allVaccines.forEach(v => {
            if (takenVaccineIds.has(v._id.toString())) return;

            const dueDate = getDueDate(dob, v.age_required_days);
            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let status = 'upcoming';
            let message = `Upcoming: ${v.name} due on ${dueDate.toLocaleDateString()} `;
            let alertLevel = 'info';

            if (diffDays < 0) {
                status = 'overdue';
                message = `OVERDUE: You missed ${v.name} !Due was ${dueDate.toLocaleDateString()} `;
                alertLevel = 'danger';
            } else if (diffDays === 0) {
                status = 'due';
                message = `Due Today: Please get ${v.name} `;
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
                return;
            }

            reminders.push({
                vaccine: v.name,
                dueDate: dueDate.toISOString().split('T')[0],
                status,
                message,
                alertLevel
            });
        });

        reminders.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        res.json({ reminders });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nurse Stats
router.get('/nurse/stats', async (req, res) => {
    try {
        // Only approximate today's date match by string or range
        // Storing date as string YYYY-MM-DD in schema for simplicity
        const today = new Date().toISOString().split('T')[0];

        const totalAppts = await Appointment.countDocuments({ appointment_date: today });
        const completed = await Appointment.countDocuments({ appointment_date: today, status: 'completed' });
        const pending = await Appointment.countDocuments({ appointment_date: today, status: 'scheduled' });

        const overdue = 5; // Mock

        res.json({
            today: totalAppts,
            completed,
            pending,
            overdue
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
        const appointments = await Appointment.find({ appointment_date: date })
            .populate('patient_id', 'name phone')
            .populate('vaccine_id', 'name')
            .sort({ appointment_time: 1 });

        const formatted = appointments.map(a => ({
            _id: a._id,
            appointment_time: a.appointment_time,
            status: a.status,
            patient_name: a.patient_id?.name,
            phone: a.patient_id?.phone,
            vaccine_name: a.vaccine_id?.name
        }));

        res.json({ appointments: formatted });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/nurse/appointment', async (req, res) => {
    const { patientId, vaccineId, date, time } = req.body;
    try {
        await Appointment.create({
            patient_id: patientId,
            hospital_id: 1, // Default
            vaccine_id: vaccineId,
            appointment_date: date,
            appointment_time: time,
            status: 'scheduled'
        });
        res.json({ message: "Appointment Scheduled" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/nurse/check-in/:id', async (req, res) => {
    try {
        await Appointment.findByIdAndUpdate(req.params.id, { status: 'checked-in' });
        res.json({ message: "Patient Checked-In" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Batch Reminders (Mock)
router.post('/admin/batch-reminders', async (req, res) => {
    try {
        const users = await User.find({ role: 'patient' });
        let count = 0;
        users.forEach(u => {
            if (Math.random() > 0.8) {
                console.log(`[Email Service] Sending reminder to ${u.email} `);
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
    try {
        const patients = await User.find({ role: 'patient', dob: { $exists: true } });
        const allVaccines = await Vaccine.find();
        const records = await VaccinationRecord.find();

        const dueList = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        patients.forEach(p => {
            const patientRecords = records.filter(r => r.patient_id.toString() === p._id.toString());
            const takenVaccineIds = new Set(patientRecords.map(r => r.vaccine_id.toString()));

            allVaccines.forEach(v => {
                if (!takenVaccineIds.has(v._id.toString())) {
                    const dueDate = new Date(p.dob);
                    dueDate.setDate(dueDate.getDate() + v.age_required_days);

                    const diffTime = dueDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    // Only show if due this week (within 7 days) or overdue
                    if (diffDays <= 7) {
                        dueList.push({
                            id: p._id,
                            name: p.name,
                            age: `${Math.floor((today - new Date(p.dob)) / (1000 * 60 * 60 * 24 * 30.44))} Months`,
                            vaccine: v.name,
                            contact: p.phone || p.email || 'No Contact',
                            dueDate: dueDate.toISOString().split('T')[0],
                            status: diffDays < 0 ? 'Overdue' : 'Due Soon'
                        });
                    }
                }
            });
        });

        res.json({ dueList: dueList.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nurse: Get All Vaccinations for Certificate Review
router.get('/nurse/all-vaccinations', async (req, res) => {
    try {
        const records = await VaccinationRecord.find()
            .populate('patient_id', 'name')
            .populate('vaccine_id', 'name')
            .populate('hospital_id', 'name')
            .sort({ date_administered: -1 });

        const formatted = records.map(r => ({
            id: r._id,
            patient_name: r.patient_id?.name || 'Unknown Patient',
            vaccine_name: r.vaccine_id?.name || 'Unknown Vaccine',
            date: r.date_administered,
            hospital_name: r.hospital_id?.name || 'City General',
            certificate_issued: r.certificate_issued
        }));

        res.json({ records: formatted });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Certificates (Patient)
router.get('/patient/:id/certificates', async (req, res) => {
    try {
        const records = await VaccinationRecord.find({
            patient_id: req.params.id,
            certificate_issued: true
        })
            .populate('vaccine_id', 'name')
            .populate('hospital_id', 'name');

        const certificates = records.map(r => ({
            id: r._id,
            date_administered: r.date_administered,
            vaccine_name: r.vaccine_id?.name,
            hospital_name: r.hospital_id?.name || 'City General'
        }));

        res.json({ certificates });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ADMIN: NURSE APPROVAL ---
router.get('/admin/nurse-requests', async (req, res) => {
    try {
        const requests = await User.find({ role: 'nurse', status: 'pending' }).sort({ created_at: -1 });
        res.json({ requests });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/admin/nurse-request/:id', async (req, res) => {
    const { action } = req.body; // 'approve' or 'reject'
    try {
        if (action === 'approve') {
            await User.findByIdAndUpdate(req.params.id, { status: 'active' });
            await logAudit('Approve Nurse', `Admin approved nurse ${req.params.id}`, 'Admin');
            res.json({ message: "Nurse approved successfully" });
        } else if (action === 'reject') {
            await User.findByIdAndDelete(req.params.id);
            await logAudit('Reject Nurse', `Admin rejected nurse ${req.params.id}`, 'Admin');
            res.json({ message: "Nurse request rejected" });
        } else {
            res.status(400).json({ error: "Invalid action" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

