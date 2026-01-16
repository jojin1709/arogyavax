require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on('connect', () => {
    console.log('Connected to the PostgreSQL database.');
});

// Initialize Tables
const initDB = async () => {
    try {
        const client = await pool.connect();
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);

            // Vaccines Table
            await client.query(`CREATE TABLE IF NOT EXISTS vaccines (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                age_required_days INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);

            // Hospitals Table (user_id is integer because serial creates integer IDs)
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
                patient_id INTEGER NOT NULL REFERENCES users(id),
                vaccine_id INTEGER NOT NULL REFERENCES vaccines(id),
                date_administered DATE,
                hospital_id INTEGER REFERENCES hospitals(id),
                status VARCHAR(20) CHECK(status IN ('pending', 'administered', 'missed')) DEFAULT 'pending'
            )`);

            // Stock Table
            await client.query(`CREATE TABLE IF NOT EXISTS stock (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
                vaccine_id INTEGER NOT NULL REFERENCES vaccines(id),
                quantity INTEGER DEFAULT 0
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

initDB();

module.exports = {
    query: (text, params) => pool.query(text, params),
};
