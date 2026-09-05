const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: "Article", required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: () => Date.now() }
});

module.exports = mongoose.model("Comment", CommentSchema);