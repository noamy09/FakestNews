const mongoose = require("mongoose");

const ArticleStatisticsSchema = new mongoose.Schema({
    articleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Article",
        required: true
    },
    // partition by hour
    timestamp: {
        type: Date,
        required: true
    },
    views: {
        type: Number,
        default: 0
    }
});
/*
this line is meant to define both articleId and timestap as unique keys together,
which means that for each article there will be only one statistic document per timeframe (hour).
This is crucial for the view count functionality.
The 1 following each of them means they go by ascending order which helps imrpove query speed.
*/
ArticleStatisticsSchema.index({ articleId: 1, timestamp: 1 }, { unique: true });

module.exports = mongoose.model("ArticleStatistics", ArticleStatisticsSchema);