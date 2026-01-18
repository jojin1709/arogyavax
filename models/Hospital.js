const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
    // We'll use a manually defined ID or let Mongo use _id. 
    // The previous SQL used integers 1, 2, ...
    // For simplicity with frontend that might expect "1", let's use a Number _id OR just rely on string IDs if we update frontend.
    // Let's adapt the app to use string IDs generally, which is better for Mongo.
    // But for the default hospital (City Gen), we might want a fixed ID.
    _id: { type: mongoose.Schema.Types.Mixed }, // Allow setting custom ID like 1
    name: { type: String, required: true },
    location: String,
    approved_status: { type: Number, default: 0 },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Hospital', hospitalSchema);
