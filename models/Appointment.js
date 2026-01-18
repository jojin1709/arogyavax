const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hospital_id: { type: mongoose.Schema.Types.Mixed, ref: 'Hospital' },
    vaccine_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vaccine' },
    appointment_date: { type: String, required: true }, // Keeping as string YYYY-MM-DD for simpler matching
    appointment_time: String,
    status: {
        type: String,
        enum: ['scheduled', 'checked-in', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', appointmentSchema);
