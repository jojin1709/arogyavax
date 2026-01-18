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
require('./models/AuditLog');
require('./models/Announcement');

const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
    console.error("CRITICAL: MONGO_URI is missing in .env!");
    // We don't throw immediately to allow server to start and maybe fail later or allow fixing env
}

const connectDB = async () => {
    try {
        await mongoose.connect(mongoURI); // Mongoose 6+ defaults are fine
        console.log('[DB] Connected to MongoDB successfully.');
        await initDB();
    } catch (err) {
        console.error('[DB] MongoDB Connection Error:', err.message);
        // Retry logic could go here
    }
};

// Initialize / Seed Data
const initDB = async () => {
    try {
        // Seed Admin
        const adminEmail = 'admin@admin.com';
        const adminExists = await User.findOne({ email: adminEmail });
        if (!adminExists) {
            console.log('[DB] Seeding Admin User...');
            await User.create({
                name: 'Super Admin',
                email: adminEmail,
                password: '$2b$10$EpW.sQY/gE/M.k.M/M.k.uX.k.uX.k.uX.k.uX.k.uX.k', // 'admin' hash
                role: 'admin'
            });
        }

        // Seed Vaccines
        const vaccinesCount = await Vaccine.countDocuments();
        if (vaccinesCount === 0) {
            console.log('[DB] Seeding Vaccines...');
            const vaccines = [
                // Birth
                { name: 'BCG', timing_label: 'At Birth', age_required_days: 0 },
                { name: 'OPV 0', timing_label: 'At Birth', age_required_days: 0 },
                { name: 'Hepatitis B 1', timing_label: 'At Birth', age_required_days: 0 },
                // 6 Weeks
                { name: 'DTwP 1', timing_label: '6 Weeks', age_required_days: 42 },
                { name: 'IPV 1', timing_label: '6 Weeks', age_required_days: 42 },
                { name: 'Hepatitis B 2', timing_label: '6 Weeks', age_required_days: 42 },
                { name: 'Hib 1', timing_label: '6 Weeks', age_required_days: 42 },
                { name: 'Rotavirus 1', timing_label: '6 Weeks', age_required_days: 42 },
                { name: 'PCV 1', timing_label: '6 Weeks', age_required_days: 42 },
                // 10 Weeks
                { name: 'DTwP 2', timing_label: '10 Weeks', age_required_days: 70 },
                { name: 'IPV 2', timing_label: '10 Weeks', age_required_days: 70 },
                { name: 'Hib 2', timing_label: '10 Weeks', age_required_days: 70 },
                { name: 'Rotavirus 2', timing_label: '10 Weeks', age_required_days: 70 },
                { name: 'PCV 2', timing_label: '10 Weeks', age_required_days: 70 },
                { name: 'Hepatitis B 3 (Optional)', timing_label: '10 Weeks', age_required_days: 70 },
                // 14 Weeks
                { name: 'DTwP 3', timing_label: '14 Weeks', age_required_days: 98 },
                { name: 'IPV 3', timing_label: '14 Weeks', age_required_days: 98 },
                { name: 'Hib 3', timing_label: '14 Weeks', age_required_days: 98 },
                { name: 'Rotavirus 3', timing_label: '14 Weeks', age_required_days: 98 },
                { name: 'PCV 3', timing_label: '14 Weeks', age_required_days: 98 },
                { name: 'Hepatitis B 4', timing_label: '14 Weeks', age_required_days: 98 },
                // 6 Months
                { name: 'Influenza 1', timing_label: '6 Months', age_required_days: 180 },
                // 7 Months
                { name: 'Influenza 2', timing_label: '7 Months', age_required_days: 210 },
                // 6-9 Months
                { name: 'Typhoid Conjugate', timing_label: '6-9 Months', age_required_days: 180 },
                // 9 Months
                { name: 'MMR 1', timing_label: '9 Months', age_required_days: 270 },
                // 12 Months
                { name: 'Hepatitis A 1', timing_label: '12 Months', age_required_days: 365 },
                { name: 'JE 1', timing_label: '12 Months', age_required_days: 365 },
                // 13 Months
                { name: 'JE 2', timing_label: '13 Months', age_required_days: 395 },
                // 15 Months
                { name: 'MMR 2', timing_label: '15 Months', age_required_days: 450 },
                { name: 'Varicella 1', timing_label: '15 Months', age_required_days: 450 },
                { name: 'PCV Booster', timing_label: '15 Months', age_required_days: 450 },
                // 16-18 Months
                { name: 'DTwP/DTaP Booster 1', timing_label: '16-18 Months', age_required_days: 480 },
                { name: 'IPV Booster 1', timing_label: '16-18 Months', age_required_days: 480 },
                { name: 'Hib Booster 1', timing_label: '16-18 Months', age_required_days: 480 },
                // 18-19 Months
                { name: 'Hepatitis A 2', timing_label: '18-19 Months', age_required_days: 540 },
                { name: 'Varicella 2', timing_label: '18-19 Months', age_required_days: 540 },
                // 4-6 Years
                { name: 'DTwP/DTaP Booster 2', timing_label: '4-6 Years', age_required_days: 1460 },
                { name: 'IPV Booster 2', timing_label: '4-6 Years', age_required_days: 1460 },
                { name: 'MMR 3', timing_label: '4-6 Years', age_required_days: 1460 },
                // 10-12 Years
                { name: 'Tdap/Td', timing_label: '10-12 Years', age_required_days: 3650 },
                { name: 'HPV', timing_label: '10-12 Years', age_required_days: 3650 },
                // Annual Flu
                { name: 'Annual Flu 2Y', timing_label: '2 Years', age_required_days: 730 },
                { name: 'Annual Flu 3Y', timing_label: '3 Years', age_required_days: 1095 },
                { name: 'Annual Flu 4Y', timing_label: '4 Years', age_required_days: 1460 },
                { name: 'Annual Flu 5Y', timing_label: '5 Years', age_required_days: 1825 }
            ];
            await Vaccine.insertMany(vaccines);
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

