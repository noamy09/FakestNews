const commentService = require("../services/commentsServices.js");

exports.getAll = async (req, res) => {
    try {
        const comments = await commentService.getComments(req.query);
        res.status(200).json(comments);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: "Error fetching comments", error: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const comment = await commentService.getCommentByID(req.params.id);
        res.status(200).json(comment);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: `Error fetching commnet ${req.params.id}`, error: error.message })
    }
};

exports.create = async (req, res) => {
    try {
        const newComment = await commentService.createComment(req.body);
        res.status(201).json(newComment);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: "Error creating comment", error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const updatedComment = await commentService.updateComment(req.params.id, req.body);
        res.status(200).json(updatedComment);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: `Error updating commnet ${req.params.id}`, error: error.message })
    }
};

exports.delete = async (req, res) => {
    try {
        const deletedComment = await commentService.deleteComment(req.params.id);
        res.status(200).json(deletedComment);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: `Error deleting commnet ${req.params.id}`, error: error.message })
    }
};
