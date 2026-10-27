import { paginationOptions } from "../utils/pagination.js";

// `fields` is the list of body keys a caller may write. Without it create and
// update would hand the whole request body to the model (mass assignment), so
// every controller that exposes them must say what is writable.
function pickFields(body, fields) {
  const picked = {};
  for (const key of fields) if (body[key] !== undefined) picked[key] = body[key];
  return picked;
}

const STAFF_ROLES = ["admin", "counsellor"];

// `hideInactive`: catalog entries staff switched off (drafts, retired items)
// are only returned to staff; everyone else gets the active ones.
export function createCrudController(Model, { fields = [], hideInactive = false } = {}) {
  const readableBy = (req) => (hideInactive && !STAFF_ROLES.includes(req.user?.role) ? { active: true } : {});

  return {
    async getAll(req, res) {
      const filter = readableBy(req);
      const pagination = paginationOptions(req.query);
      const query = Model.find(filter).sort({ createdAt: -1 });
      if (pagination) {
        res.setHeader("X-Total-Count", await Model.countDocuments(filter));
        query.skip(pagination.skip).limit(pagination.limit);
      }
      res.json(await query);
    },

    async getOne(req, res) {
      const doc = await Model.findOne({ _id: req.params.id, ...readableBy(req) });
      if (!doc) {
        return res.status(404).json({ message: "Not found" });
      }
      res.json(doc);
    },

    async create(req, res) {
      const doc = await Model.create(pickFields(req.body, fields));
      res.status(201).json(doc);
    },

    async update(req, res) {
      const doc = await Model.findByIdAndUpdate(req.params.id, pickFields(req.body, fields), {
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
