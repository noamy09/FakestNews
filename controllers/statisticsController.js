// Simple controller for statistics
exports.getAll = (req, res) => {
    res.json({ message: "Get all statistics" });
};

exports.getById = (req, res) => {
    res.json({ message: "Get statistics by id " + req.params.id });
};

exports.create = (req, res) => {
    res.json({ message: "Create new statistics" });
};

exports.update = (req, res) => {
    res.json({ message: "Update statistics " + req.params.id });
};

exports.delete = (req, res) => {
    res.json({ message: "Delete statistics " + req.params.id });
};
