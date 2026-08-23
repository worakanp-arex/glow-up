import JobSkill from "../models/JobSkill.js";
import { createCrudController } from "./crudFactory.js";

const { getAll, getOne, create, update, remove } = createCrudController(JobSkill);

export {
  getAll as getJobSkills,
  getOne as getJobSkill,
  create as createJobSkill,
  update as updateJobSkill,
  remove as deleteJobSkill,
};
