const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    hospital_id: { type: mongoose.Schema.Types.Mixed, ref: 'Hospital', required: true },
    vaccine_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vaccine', required: true },
    quantity: { type: Number, default: 0 }
});

module.exports = mongoose.model('Stock', stockSchema);
