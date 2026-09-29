import { paginationOptions } from "../utils/pagination.js";

export function createCrudController(Model) {
  return {
    async getAll(req, res) {
      const pagination = paginationOptions(req.query);
      const query = Model.find().sort({ createdAt: -1 });
      if (pagination) {
        res.setHeader("X-Total-Count", await Model.countDocuments());
        query.skip(pagination.skip).limit(pagination.limit);
      }
      res.json(await query);
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
