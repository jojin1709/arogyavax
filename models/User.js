const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Auto-increment ID is not standard in Mongo, but we made code rely on 'id' (integer) or string.
    // Mongoose uses _id (ObjectId).
    // We will stick to _id for internal mongo usage, but if the frontend relies on "id", we might need to map it.
    // For specific role logic that assumes integers (like `params.id`), we might need to be careful.
    // However, string IDs work fine in JS logic usually.
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        required: true,
        enum: ['patient', 'admin', 'nurse']
    },
    phone: String,
    aadhaar: String,
    profile_pic: String,
    status: { type: String, default: 'active' }, // active, pending

    // Specific fields
    admit_id: String, // Patient
    trna_id: String, // Nurse
    hospital_location: String, // Nurse

    // Common
    dob: Date,
    gender: String,
    address: String,
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
