const mongoose = require("mongoose");
require("dotenv").config();

async function connectToDB() {
    try {
        const url = process.env.DB_URL;
        console.log(url);
        if (!url) {
            throw new Error("DB_URL is missing in environment variables or misconfigured!");
        }

        await mongoose.connect(url);
        console.log("Connected to Server");
    } catch (error) {
        console.error("Error connecting to Server", error);
    }
}

mongoose.connection.on('error', (error) => {
    console.log("couldn't connect to the DB", error);
})

mongoose.connection.on('disconnected', () => {
    console.log("Disconnected from DB");
})

module.exports = connectToDB;
