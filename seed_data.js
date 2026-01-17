const db = require('./database');

const seed = async () => {
    try {
        console.log("Initializing Scheduler...");
        // Wait for pool to be ready
        const pool = await db.getPool();
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            console.log("Connected. Seeding Data...");

            // 1. Users
            console.log("Seeding Users...");
            // Fake Patient
            await client.query(`
                INSERT INTO users (name, email, password, role, status) 
                VALUES ('John Doe', 'john@demo.com', '$2b$10$EpW.sQY/gE/M.k.M/M.k.uX.k.uX.k.uX.k.uX.k.uX.k', 'patient', 'active') 
                ON CONFLICT (email) DO NOTHING
            `);
            // Fake Nurse
            await client.query(`
                INSERT INTO users (name, email, password, role, status, hospital_location) 
                VALUES ('Nurse Mary', 'mary@demo.com', '$2b$10$EpW.sQY/gE/M.k.M/M.k.uX.k.uX.k.uX.k.uX.k.uX.k', 'nurse', 'active', 'City Hospital') 
                ON CONFLICT (email) DO NOTHING
            `);

            // 2. Hospitals
            console.log("Seeding Hospitals...");
            const hRes = await client.query(`
                INSERT INTO hospitals (name, location, approved_status) 
                VALUES ('City General Hospital', 'New York', 1)
                RETURNING id
            `);
            const hospitalId = hRes.rows[0]?.id || 1;

            // 3. Appointments
            console.log("Seeding Recent Activity (Appointments)...");
            const patientRes = await client.query("SELECT id FROM users WHERE email='john@demo.com'");
            if (patientRes.rows.length > 0) {
                const pid = patientRes.rows[0].id;
                await client.query(`
                    INSERT INTO appointments (patient_id, hospital_id, vaccine_id, appointment_date, status)
                    VALUES ($1, $2, 1, CURRENT_DATE, 'scheduled')
                `, [pid, hospitalId]);
            }

            await client.query('COMMIT');
            console.log("✅ Seeding Complete! Refresh the dashboard.");
        } catch (e) {
            await client.query('ROLLBACK');
            console.error("Seeding Transaction Failed:", e);
        } finally {
            client.release();
            // Don't close pool as server might be using it if we were integrated, 
            // but this is a standalone script so we should exit.
            process.exit(0);
        }
    } catch (err) {
        console.error("Seeding Script Error:", err);
        process.exit(1);
    }
};

seed();
