const Note = require("../models/notes");
const mongoose = require("mongoose");

const noteValidation = (note) => {
    if (note === null || note === undefined) {
        throw new Error("Note is null", 400);
    }
    if (note.content === null || note.content === undefined) {
        throw new Error("Note content is missing", 400);
    }
    if (note.articleId === null || note.articleId === undefined) {
        throw new Error("Note articleId is missing", 400);
    }
    if (note.author === null || note.author === undefined) {
        throw new Error("Note author is missing", 400);
    }
};

const IDValidation = (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid note ID", 400);
    }
};

const getNotes = async (query = {}) => {
    const filter = {};
    const allowedFilters = ['articleId', 'author', 'content', 'page', 'limit'];
    
    allowedFilters.forEach(field => {
        if (query[field]) {
            filter[field] = query[field];
        }
    });

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    return await Note.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
};

const getNoteByID = async (id) => {
    IDValidation(id);
    const note = await Note.findById(id);
    if (!note) {
        throw new Error("Note not found", 404);
    }
    return note;
};

const createNote = async (note) => {
    noteValidation(note);
    const newNote = new Note(note);
    return await newNote.save();
};

const updateNote = async (id, note) => {
    IDValidation(id);
    if (note === null || note === undefined) {
        throw new Error("No changes were given", 400);
    }
    const updatedNote = await Note.findByIdAndUpdate(id, note, { new: true });
    if (!updatedNote) {
        throw new Error("Note not found", 404);
    }
    return updatedNote;
};

const deleteNote = async (id) => {
    IDValidation(id);
    const deletedNote = await Note.findByIdAndDelete(id);
    if (!deletedNote) {
        throw new Error("Note not found", 404);
    }
    return deletedNote;
};

module.exports = {
    getNotes,
    getNoteByID,
    createNote,
    updateNote,
    deleteNote
};