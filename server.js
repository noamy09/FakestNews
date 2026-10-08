require("dotenv").config(); // Loads variables from .env
const express = require("express");
const path = require("path");
const connectToDB = require("./models/db.js");
const mainRouter = require('./routes/router');
const weatherService = require('./services/weatherService');

connectToDB();

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json({ limit: '50mb' })); // increased limit for photo publishing as part of article creation.
app.use(express.static(path.join(__dirname, "public")));
app.use('/', mainRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    weatherService.getWeather().catch(() => {}); // warm the cache so the first visitor doesn't wait
});
