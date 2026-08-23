import Skill from "../models/Skill.js";
import { createCrudController } from "./crudFactory.js";

const { getAll, create } = createCrudController(Skill);

export { getAll as getSkills, create as createSkill };
