const NoteService = require("../services/notesServices.js");

exports.getAll = async (req, res) => {
    try {
        const notes = await NoteService.getNotes(req.query);
        res.status(200).json(notes);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: "Error fetching notes", error: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const notes = await NoteService.getNoteByID(req.params.id);
        res.status(200).json(notes);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: `Error fetching note ${req.params.id}`, error: error.message })
    }
};

exports.create = async (req, res) => {
    try {
        const newNote = await NoteService.createNote(req.body);
        res.status(201).json(newNote);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: "Error creating note", error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const updatedNote = await NoteService.updateNote(req.params.id, req.body);
        res.status(200).json(updatedNote);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: `Error updating note ${req.params.id}`, error: error.message })
    }
};

exports.delete = async (req, res) => {
    try {
        const deletedNote = await NoteService.deleteNote(req.params.id);
        res.status(200).json(deletedNote);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: `Error deleting note ${req.params.id}`, error: error.message })
    }
};
