const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    action: { type: String, required: true },
    details: String,
    performed_by: String,
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
