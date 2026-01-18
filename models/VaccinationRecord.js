const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vaccine_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vaccine' },
    date_administered: Date,
    hospital_id: { type: mongoose.Schema.Types.Mixed, ref: 'Hospital' }, // Mixed because Hospital ID might be 1 (Int) or ObjectID
    status: {
        type: String,
        enum: ['pending', 'administered', 'missed', 'completed'],
        default: 'pending'
    },
    certificate_issued: { type: Boolean, default: false }
});

module.exports = mongoose.model('VaccinationRecord', recordSchema);
