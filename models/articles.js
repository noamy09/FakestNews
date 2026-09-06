const mongoose = require("mongoose");

// define the schema for the helper object "draft" which will contain the draft of the article.
// we set { _id: false } so that the draft object will not have its own _id
const draftSchema = new mongoose.Schema({
    title: { type: String },
    category: { type: String },
    summary: { type: String },
    content: { type: String },
    imageUrl: { type: String }
}, { _id: false });

const articleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    summary: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: () => Date.now() },
    status: { type: String, enum: ["pending", "published", "draft"], default: "draft" },
    imageUrl: { type: String, default: "placeholder.jpg" },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    views: { type: Number, default: 0 },
    draft: { type: draftSchema, default: null }, // the draft is an object that contains the current draft of the article.
    updatesHistory: [{
        updaterId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        updatedAt: { type: Date, default: () => Date.now() },
        edits: { type: String, default: "Article updated." }
    }]
});

module.exports = mongoose.model("Article", articleSchema);
