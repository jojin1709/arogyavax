const sqlite3 = require('sqlite3').verbose();
const dbName = 'arogyavax.db';

const db = new sqlite3.Database(dbName, (err) => {
    if (err) {
        console.error('Error opening database ' + dbName + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.serialize(() => {
            // Users Table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT CHECK(role IN ('patient', 'admin', 'nurse')) NOT NULL,
                phone TEXT,
                aadhaar TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Vaccines Table
            db.run(`CREATE TABLE IF NOT EXISTS vaccines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                age_required_days INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Hospitals Table
            db.run(`CREATE TABLE IF NOT EXISTS hospitals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                location TEXT,
                approved_status INTEGER DEFAULT 0,
                user_id INTEGER,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`);

            // Vaccination Records Table
            db.run(`CREATE TABLE IF NOT EXISTS vaccination_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                vaccine_id INTEGER NOT NULL,
                date_administered DATETIME,
                hospital_id INTEGER,
                status TEXT CHECK(status IN ('pending', 'administered', 'missed')) DEFAULT 'pending',
                FOREIGN KEY (patient_id) REFERENCES users(id),
                FOREIGN KEY (vaccine_id) REFERENCES vaccines(id),
                FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
            )`);
            
            // Stock Table
            db.run(`CREATE TABLE IF NOT EXISTS stock (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hospital_id INTEGER NOT NULL,
                vaccine_id INTEGER NOT NULL,
                quantity INTEGER DEFAULT 0,
                FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
                FOREIGN KEY (vaccine_id) REFERENCES vaccines(id)
            )`);
        });
    }
});

module.exports = db;
