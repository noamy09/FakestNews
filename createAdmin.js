require('dotenv').config();

// Fix for modern MongoDB driver expecting global crypto in Node.js
const crypto = require('crypto');
if (!globalThis.crypto) {
    globalThis.crypto = crypto;
}

const mongoose = require('mongoose');
const User = require('./models/User'); // Adjust the path to your User model if necessary

// Explicit MongoDB connection string provided
const MONGO_URI = "mongodb+srv://ozafik98_db_user:mVJhbFwfWQsa08Fr@cluster0.iaoyvyx.mongodb.net/FakestNews?retryWrites=true&w=majority&appName=Cluster0";

async function createAdminUser() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("Connected successfully to MongoDB.");

        const adminEmail = "admin@fakestnews.com";

        // Check if an admin user already exists to avoid duplicate entries
        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log("⚠️ Admin user already exists in the database.");
            process.exit(0);
        }

        // Create the new official admin user
        const adminUser = new User({
            username: "Admin",
            email: adminEmail,
            password: "ADMIN123",
            role: "admin"
        });

        await adminUser.save();
        console.log("✅ Official Admin user created successfully!");
        console.log(`Email: ${adminEmail}`);
        console.log("Password: ADMIN123");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error creating admin user:", error);
        process.exit(1);
    }
}

createAdminUser();