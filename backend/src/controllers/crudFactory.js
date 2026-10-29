import { paginationOptions } from "../utils/pagination.js";

// `fields` คือรายการ key ใน body ที่ผู้เรียกเขียนได้ หากไม่ระบุ create และ
// update จะส่ง body ทั้งหมดให้ model (mass assignment)
// ดังนั้นทุก controller ที่เปิดใช้ต้องระบุว่าฟิลด์ไหนเขียนได้
function pickFields(body, fields) {
  const picked = {};
  for (const key of fields) if (body[key] !== undefined) picked[key] = body[key];
  return picked;
}

const STAFF_ROLES = ["admin", "counsellor"];

// `hideInactive`: รายการแคตตาล็อกที่เจ้าหน้าที่ปิดไว้ (ฉบับร่าง รายการเลิกใช้)
// จะส่งคืนให้เจ้าหน้าที่เท่านั้น คนอื่นได้เฉพาะรายการที่ใช้งานอยู่
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
