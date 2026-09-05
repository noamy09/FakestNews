// Simple controller for users
exports.getAll = (req, res) => {
    res.json({ message: "Get all users" });
};

exports.getById = (req, res) => {
    res.json({ message: "Get users by id " + req.params.id });
};

exports.create = (req, res) => {
    res.json({ message: "Create new users" });
};

exports.update = (req, res) => {
    res.json({ message: "Update users " + req.params.id });
};

exports.delete = (req, res) => {
    res.json({ message: "Delete users " + req.params.id });
};
