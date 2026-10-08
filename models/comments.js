const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: "Article", required: true },
    content: { type: String, required: true, trim: true, minlength: 1, maxlength: 1000 },
    // Guests comment without an account, so the display name is stored on the comment itself.
    authorName: { type: String, required: true, trim: true, minlength: 1, maxlength: 50 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdAt: { type: Date, default: () => Date.now() }
});

CommentSchema.index({ articleId: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model("Comment", CommentSchema);
