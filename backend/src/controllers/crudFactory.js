export function createCrudController(Model) {
  return {
    async getAll(req, res) {
      const docs = await Model.find().sort({ createdAt: -1 });
      res.json(docs);
    },

    async getOne(req, res) {
      const doc = await Model.findById(req.params.id);
      if (!doc) {
        return res.status(404).json({ message: "Not found" });
      }
      res.json(doc);
    },

    async create(req, res) {
      const doc = await Model.create(req.body);
      res.status(201).json(doc);
    },

    async update(req, res) {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!doc) {
        return res.status(404).json({ message: "Not found" });
      }
      res.json(doc);
    },

    async remove(req, res) {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) {
        return res.status(404).json({ message: "Not found" });
      }
      res.status(204).send();
    },
  };
}
