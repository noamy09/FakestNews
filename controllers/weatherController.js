const weatherService = require("../services/weatherService");

exports.getWeather = async (req, res) => {
    try {
        const weather = await weatherService.getWeather();
        const maxAge = weather.stale ? 60 : Math.min(weatherService.secondsUntilExpiry(), 300);
        res.set("Cache-Control", `public, max-age=${maxAge}`);
        res.status(200).json(weather);
    } catch (error) {
        res.status(error.statusCode || 503).json({ message: "Weather data is currently unavailable" });
    }
};
