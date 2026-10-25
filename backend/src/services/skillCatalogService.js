import Skill from "../models/Skill.js";
import { DEFAULT_SKILLS } from "../constants/skills.js";

// Makes sure the standard career-skill catalogue exists. Safe to run on every
// start-up: it only adds skills that are missing (matched by name) and fills in
// the category of older records that have none — it never edits or removes
// anything an admin changed.
export async function ensureDefaultSkills() {
  const existing = await Skill.find().select("skillName category");
  const byName = new Map(existing.map((skill) => [skill.skillName, skill]));

  const missing = [];
  let categorised = 0;
  for (const [category, names] of Object.entries(DEFAULT_SKILLS)) {
    for (const skillName of names) {
      const current = byName.get(skillName);
      if (!current) {
        missing.push({ skillName, category });
      } else if (!current.category) {
        await Skill.updateOne({ _id: current._id }, { category });
        categorised += 1;
      }
    }
  }
  if (missing.length > 0) await Skill.insertMany(missing);
  return { added: missing.length, categorised };
}
