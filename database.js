require('dotenv').config();
const mongoose = require('mongoose');

// Import Models
const User = require('./models/User');
const Vaccine = require('./models/Vaccine');
const Hospital = require('./models/Hospital');
// We import others just to ensure they are registered if needed, though require usually does it.
require('./models/VaccinationRecord');
require('./models/Stock');
require('./models/Appointment');
const AuditLog = require('./models/AuditLog');
require('./models/Announcement');

const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
    console.error("CRITICAL: MONGO_URI is missing in .env!");
    // We don't throw immediately to allow server to start and maybe fail later or allow fixing env
}

const connectDB = async () => {
    try {
        console.log(`[DB] Attempting connection to: ${mongoURI ? mongoURI.substring(0, 30) + "..." : "UNDEFINED"}`);
        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
        });
        console.log('[DB] Connected to MongoDB successfully.');
        await initDB();
    } catch (err) {
        console.error('[DB] MongoDB Connection Error:', err.message);
        // On Vercel, we might need to handle cold starts
    }
};

const bcrypt = require('bcryptjs');

// Initialize / Seed Data
const initDB = async () => {
    try {

        // Seed Admin - Force Update/Upsert to ensure password is always correct ('admin')
        const adminEmail = 'admin@admin.com';
        console.log('[DB] Ensuring Admin User exists and has correct password...');
        const adminHash = await bcrypt.hash('admin', 10);

        await User.findOneAndUpdate(
            { email: adminEmail },
            {
                name: 'Super Admin',
                email: adminEmail,
                password: adminHash,
                role: 'admin',
                status: 'active'
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Seed Nurse - Force Update/Upsert
        const nurseEmail = 'nurse@nurse.com';
        console.log('[DB] Ensuring Nurse User exists...');
        const nurseHash = await bcrypt.hash('nurse', 10);

        await User.findOneAndUpdate(
            { email: nurseEmail },
            {
                name: 'Head Nurse',
                email: nurseEmail,
                password: nurseHash,
                role: 'nurse',
                status: 'active', // Auto-approve this default nurse
                phone: '1234567890',
                hospital_location: 'City General Hospital'
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Seed Initial Audit Log
        const logCount = await AuditLog.countDocuments();
        if (logCount === 0) {
            console.log('[DB] Seeding initial audit log...');
            await new AuditLog({
                action: 'SYSTEM_INIT',
                details: 'System initialized and admin verified.',
                performed_by: 'System',
                created_at: new Date()
            }).save();
        }

        // Seed Vaccines (Upsert to ensure all exist)
        console.log('[DB] Seeding/Updating Vaccines...');
        const vaccines = [
            // Birth
            { name: 'BCG', timing_label: 'At Birth', age_required_days: 0 },
            { name: 'Hepatitis B-1 (BD)', timing_label: 'At Birth', age_required_days: 0 },
            { name: 'OPV 0', timing_label: 'At Birth', age_required_days: 0 },
            // 6 Weeks
            { name: 'DTwP/DTaP-1', timing_label: '6 Weeks', age_required_days: 42 },
            { name: 'IPV-1', timing_label: '6 Weeks', age_required_days: 42 },
            { name: 'Hib-1', timing_label: '6 Weeks', age_required_days: 42 },
            { name: 'Hep B-2', timing_label: '6 Weeks', age_required_days: 42 },
            { name: 'Rotavirus-1', timing_label: '6 Weeks', age_required_days: 42 },
            { name: 'PCV-1', timing_label: '6 Weeks', age_required_days: 42 },
            // 10 Weeks
            { name: 'DTwP/DTaP-2', timing_label: '10 Weeks', age_required_days: 70 },
            { name: 'IPV-2', timing_label: '10 Weeks', age_required_days: 70 },
            { name: 'Hib-2', timing_label: '10 Weeks', age_required_days: 70 },
            { name: 'Hep B-3', timing_label: '10 Weeks', age_required_days: 70 },
            { name: 'Rotavirus-2', timing_label: '10 Weeks', age_required_days: 70 },
            { name: 'PCV-2', timing_label: '10 Weeks', age_required_days: 70 },
            // 14 Weeks
            { name: 'DTwP/DTaP-3', timing_label: '14 Weeks', age_required_days: 98 },
            { name: 'IPV-3', timing_label: '14 Weeks', age_required_days: 98 },
            { name: 'Hib-3', timing_label: '14 Weeks', age_required_days: 98 },
            { name: 'Hep B-4', timing_label: '14 Weeks', age_required_days: 98 },
            { name: 'Rotavirus-3', timing_label: '14 Weeks', age_required_days: 98 },
            { name: 'PCV-3', timing_label: '14 Weeks', age_required_days: 98 },
            // 6 Months
            { name: 'Influenza(IIV)-1', timing_label: '6 Months', age_required_days: 180 },
            // 7 Months
            { name: 'Influenza(IIV)-2', timing_label: '7 Months', age_required_days: 210 },
            // 6-9 Months
            { name: 'Typhoid Conjugate', timing_label: '6-9 Months', age_required_days: 180 },
            // 9 Months
            { name: 'MMR-1', timing_label: '9 Months', age_required_days: 270 },
            // 12 Months
            { name: 'Hepatitis A', timing_label: '12 Months', age_required_days: 365 },
            { name: 'JE-1', timing_label: '12 Months', age_required_days: 365 },
            // 13 Months
            { name: 'JE-2', timing_label: '13 Months', age_required_days: 395 },
            // 15 Months
            { name: 'MMR-2', timing_label: '15 Months', age_required_days: 450 },
            { name: 'Varicella-1', timing_label: '15 Months', age_required_days: 450 },
            { name: 'PCV Booster', timing_label: '15 Months', age_required_days: 450 },
            // 16-18 Months
            { name: 'DTwP/DTaP-B1', timing_label: '16-18 Months', age_required_days: 480 },
            { name: 'Hib-B1', timing_label: '16-18 Months', age_required_days: 480 },
            { name: 'IPV-B1', timing_label: '16-18 Months', age_required_days: 480 },
            // 18-19 Months
            { name: 'Hep A-2', timing_label: '18-19 Months', age_required_days: 540 },
            { name: 'Varicella-2', timing_label: '18-19 Months', age_required_days: 540 },
            // 4-6 Years
            { name: 'DTwP/DTaP-B2', timing_label: '4-6 Years', age_required_days: 1460 },
            { name: 'IPV-B2', timing_label: '4-6 Years', age_required_days: 1460 },
            { name: 'MMR-3', timing_label: '4-6 Years', age_required_days: 1460 },
            // 10-12 Years
            { name: 'Tdap', timing_label: '10-12 Years', age_required_days: 3650 },
            { name: 'HPV', timing_label: '10-12 Years', age_required_days: 3650 },
            // Annual Flu
            { name: 'Annual Flu 2 Years', timing_label: '2 Years', age_required_days: 730 },
            { name: 'Annual Flu 3 Years', timing_label: '3 Years', age_required_days: 1095 },
            { name: 'Annual Flu 4 Years', timing_label: '4 Years', age_required_days: 1460 },
            { name: 'Annual Flu 5 Years', timing_label: '5 Years', age_required_days: 1825 }
        ];

        for (const v of vaccines) {
            await Vaccine.updateOne({ name: v.name }, { $set: v }, { upsert: true });
        }

        // Seed Default Hospital
        const defaultHospital = await Hospital.findOne({ _id: 1 });
        if (!defaultHospital) {
            console.log('[DB] Seeding Default Hospital...');
            await Hospital.create({
                _id: 1, // Explicit ID for legacy support/demo
                name: 'City General Hospital',
                location: 'City Center',
                approved_status: 1
            });
        }

    } catch (err) {
        console.error('[DB] Initialization/Seeding Error:', err);
    }
};

// Connect immediately
connectDB();

// Export models to be used elsewhere
module.exports = {
    mongoose,
    User,
    Vaccine,
    Hospital,
    VaccinationRecord: require('./models/VaccinationRecord'),
    Stock: require('./models/Stock'),
    Appointment: require('./models/Appointment'),
    AuditLog: require('./models/AuditLog'),
    Announcement: require('./models/Announcement')
};

