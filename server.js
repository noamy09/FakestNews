require("dotenv").config(); // Loads variables from .env
const express = require("express");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const connectToDB = require("./models/db.js");
const mainRouter = require("./routes/router");
const errorHandler = require("./middlewares/errorHandler");
const weatherService = require("./services/weatherService");

connectToDB();

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Session infrastructure backed by MongoDB Atlas (DB_URL)
app.use(session({
    secret: process.env.SESSION_SECRET || "fakestnews_session_secret_key_2026",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.DB_URL,
        collectionName: "sessions"
    }),
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use("/", mainRouter);

// Centralized Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    weatherService.getWeather().catch(() => {}); // warm the cache so the first visitor doesn't wait
});
