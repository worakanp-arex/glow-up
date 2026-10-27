import Skill from "../models/Skill.js";
import { createCrudController } from "./crudFactory.js";
import { paginationOptions, escapeRegex } from "../utils/pagination.js";

const { create } = createCrudController(Skill, { fields: ["skillName", "category"] });

// Optional ?q= (name search) and ?category= filters; grouped by category so the
// pickers can render headings without re-sorting.
export async function getSkills(req, res) {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.q) filter.skillName = new RegExp(escapeRegex(String(req.query.q).trim()), "i");

  const pagination = paginationOptions(req.query);
  const query = Skill.find(filter).sort({ category: 1, skillName: 1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await Skill.countDocuments(filter));
    query.skip(pagination.skip).limit(pagination.limit);
  }
  res.json(await query);
}

export { create as createSkill };
