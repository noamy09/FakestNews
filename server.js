require("dotenv").config(); // Loads variables from .env
const express = require("express");
const path = require("path");
const connectToDB = require("./models/db.js");
const mainRouter = require('./routes/router');

connectToDB();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use('/', mainRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
