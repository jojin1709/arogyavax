const mongoose = require('mongoose');

const vaccineSchema = new mongoose.Schema({
    name: { type: String, required: true },
    timing_label: String,
    description: String,
    age_required_days: Number,
    created_at: { type: Date, default: Date.now }
});

// Compound index equivalent to UNIQUE(name, timing_label)
vaccineSchema.index({ name: 1, timing_label: 1 }, { unique: true });

module.exports = mongoose.model('Vaccine', vaccineSchema);
