require('dotenv').config();
const { Pool } = require('pg');
const dns = require('dns');
const { URL } = require('url');

let pool = null;
let initPromise = null;

// Async Initializer
async function getPool() {
    if (pool) return pool;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        const dbUrl = process.env.DATABASE_URL;
        let connectionString = dbUrl;

        try {
            const parsed = new URL(dbUrl);
            const hostname = parsed.hostname;

            console.log(`Resolving database host: ${hostname}...`);
            const addresses = await new Promise((resolve, reject) => {
                dns.resolve4(hostname, (err, addrs) => {
                    if (err) resolve([]);
                    else resolve(addrs);
                });
            });

            if (addresses && addresses.length > 0) {
                console.log(`Resolved to IPv4: ${addresses[0]}`);
                // Replace hostname with IP in the connection string
                connectionString = dbUrl.replace(hostname, addresses[0]);
            } else {
                console.warn("IPv4 resolution failed or empty. Falling back to original URL.");
            }
        } catch (e) {
            console.error("DNS Resolution Error:", e);
        }

        pool = new Pool({
            connectionString: connectionString,
            ssl: { rejectUnauthorized: false }
        });

        pool.on('connect', () => {
            console.log('Connected to the PostgreSQL database.');
        });

        return pool;
    })();

    return initPromise;
}

// Initialize Tables
const initDB = async () => {
    try {
        const p = await getPool();
        const client = await p.connect();
        try {
            await client.query('BEGIN');

            // Users Table
            await client.query(`CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role VARCHAR(20) CHECK(role IN ('patient', 'admin', 'nurse')) NOT NULL,
                phone VARCHAR(20),
                aadhaar VARCHAR(20),
                profile_pic TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);

            // Migration: Add profile_pic to users if not exists
            try {
                await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_pic TEXT");
                // New: Add status column for approval workflow (default active)
                await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'");
                // New: Add Admit ID (for patients)
                await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS admit_id VARCHAR(50)");
                // New: Add TRNA ID and Location (for nurses)
                await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS trna_id VARCHAR(50)");
                await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS hospital_location VARCHAR(100)");

                console.log("Verified/Added all user columns");
            } catch (e) {
                console.error('Migration Error (columns):', e.message);
            }

            // Seed Admin User
            await client.query(`
                INSERT INTO users (name, email, password, role) 
                VALUES ('Super Admin', 'admin@admin.com', '$2b$10$EpW.sQY/gE/M.k.M/M.k.uX.k.uX.k.uX.k.uX.k.uX.k', 'admin') 
                ON CONFLICT (email) DO NOTHING
            `);

            // Vaccines Table (Updated with timing_label)
            await client.query(`CREATE TABLE IF NOT EXISTS vaccines (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                timing_label VARCHAR(100),
                description TEXT,
                age_required_days INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(name, timing_label)
            )`);

            // Seed Vaccines
            const vaccines = [
                // Birth
                { name: 'BCG', timing: 'At Birth', days: 0 },
                { name: 'OPV 0', timing: 'At Birth', days: 0 },
                { name: 'Hepatitis B 1', timing: 'At Birth', days: 0 },
                // 6 Weeks
                { name: 'DTwP 1', timing: '6 Weeks', days: 42 },
                { name: 'IPV 1', timing: '6 Weeks', days: 42 },
                { name: 'Hepatitis B 2', timing: '6 Weeks', days: 42 },
                { name: 'Hib 1', timing: '6 Weeks', days: 42 },
                { name: 'Rotavirus 1', timing: '6 Weeks', days: 42 },
                { name: 'PCV 1', timing: '6 Weeks', days: 42 },
                // 10 Weeks
                { name: 'DTwP 2', timing: '10 Weeks', days: 70 },
                { name: 'IPV 2', timing: '10 Weeks', days: 70 },
                { name: 'Hib 2', timing: '10 Weeks', days: 70 },
                { name: 'Rotavirus 2', timing: '10 Weeks', days: 70 },
                { name: 'PCV 2', timing: '10 Weeks', days: 70 },
                { name: 'Hepatitis B 3 (Optional if catch-up)', timing: '10 Weeks', days: 70 },
                // 14 Weeks
                { name: 'DTwP 3', timing: '14 Weeks', days: 98 },
                { name: 'IPV 3', timing: '14 Weeks', days: 98 },
                { name: 'Hib 3', timing: '14 Weeks', days: 98 },
                { name: 'Rotavirus 3', timing: '14 Weeks', days: 98 },
                { name: 'PCV 3', timing: '14 Weeks', days: 98 },
                { name: 'Hepatitis B 4', timing: '14 Weeks', days: 98 },
                // 6 Months
                { name: 'Influenza 1', timing: '6 Months', days: 180 },
                // 7 Months
                { name: 'Influenza 2', timing: '7 Months', days: 210 },
                // 6-9 Months
                { name: 'Typhoid Conjugate', timing: '6-9 Months', days: 180 },
                // 9 Months
                { name: 'MMR 1', timing: '9 Months', days: 270 },
                // 12 Months
                { name: 'Hepatitis A 1', timing: '12 Months', days: 365 },
                { name: 'JE 1', timing: '12 Months', days: 365 },
                // 13 Months
                { name: 'JE 2', timing: '13 Months', days: 395 },
                // 15 Months
                { name: 'MMR 2', timing: '15 Months', days: 450 },
                { name: 'Varicella 1', timing: '15 Months', days: 450 },
                { name: 'PCV Booster', timing: '15 Months', days: 450 },
                // 16-18 Months
                { name: 'DTwP/DTaP Booster 1', timing: '16-18 Months', days: 480 },
                { name: 'IPV Booster 1', timing: '16-18 Months', days: 480 },
                { name: 'Hib Booster 1', timing: '16-18 Months', days: 480 },
                // 18-19 Months
                { name: 'Hepatitis A 2', timing: '18-19 Months', days: 540 },
                { name: 'Varicella 2', timing: '18-19 Months', days: 540 },
                // 4-6 Years
                { name: 'DTwP/DTaP Booster 2', timing: '4-6 Years', days: 1460 },
                { name: 'IPV Booster 2', timing: '4-6 Years', days: 1460 },
                { name: 'MMR 3', timing: '4-6 Years', days: 1460 },
                // 10-12 Years
                { name: 'Tdap/Td', timing: '10-12 Years', days: 3650 },
                { name: 'HPV', timing: '10-12 Years', days: 3650 },
                // Annual Flu
                { name: 'Annual Flu 2Y', timing: '2 Years', days: 730 },
                { name: 'Annual Flu 3Y', timing: '3 Years', days: 1095 },
                { name: 'Annual Flu 4Y', timing: '4 Years', days: 1460 },
                { name: 'Annual Flu 5Y', timing: '5 Years', days: 1825 }
            ];

            for (const v of vaccines) {
                await client.query(`
                    INSERT INTO vaccines (name, timing_label, age_required_days) 
                    VALUES ($1, $2, $3) 
                    ON CONFLICT (name, timing_label) DO NOTHING
                `, [v.name, v.timing, v.days]);
            }

            // Hospitals Table 
            await client.query(`CREATE TABLE IF NOT EXISTS hospitals (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                location TEXT,
                approved_status INTEGER DEFAULT 0,
                user_id INTEGER REFERENCES users(id)
            )`);

            // Vaccination Records
            await client.query(`CREATE TABLE IF NOT EXISTS vaccination_records (
                id SERIAL PRIMARY KEY,
                patient_id INT,
                vaccine_id INT,
                date_administered DATE,
                hospital_id INT,
                status VARCHAR(50) CHECK(status IN ('pending', 'administered', 'missed')) DEFAULT 'pending',
                certificate_issued BOOLEAN DEFAULT FALSE,
                FOREIGN KEY(patient_id) REFERENCES users(id),
                FOREIGN KEY(vaccine_id) REFERENCES vaccines(id),
                FOREIGN KEY(hospital_id) REFERENCES hospitals(id)
            )`);

            // Stock Table
            await client.query(`CREATE TABLE IF NOT EXISTS stock (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
                vaccine_id INTEGER NOT NULL REFERENCES vaccines(id),
                quantity INTEGER DEFAULT 0
            )`);

            // Appointments Table
            await client.query(`CREATE TABLE IF NOT EXISTS appointments (
                id SERIAL PRIMARY KEY,
                patient_id INTEGER NOT NULL REFERENCES users(id),
                hospital_id INTEGER REFERENCES hospitals(id),
                vaccine_id INTEGER REFERENCES vaccines(id),
                appointment_date DATE NOT NULL,
                appointment_time TIME,
                status VARCHAR(20) CHECK(status IN ('scheduled', 'checked-in', 'completed', 'cancelled')) DEFAULT 'scheduled',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);

            // Audit Logs Table
            await client.query(`CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                action VARCHAR(255) NOT NULL,
                details TEXT,
                performed_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);

            // Announcements Table (CMS)
            await client.query(`CREATE TABLE IF NOT EXISTS announcements (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};

// Kick off init
initDB();

module.exports = {
    query: async (text, params) => {
        const p = await getPool();
        return p.query(text, params);
    },
    getPool: getPool
};
