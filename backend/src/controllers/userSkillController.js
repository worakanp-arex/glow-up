import UserSkill from "../models/UserSkill.js";
import { createCrudController } from "./crudFactory.js";

const { getAll, getOne, create, update, remove } = createCrudController(UserSkill);

export {
  getAll as getUserSkills,
  getOne as getUserSkill,
  create as createUserSkill,
  update as updateUserSkill,
  remove as deleteUserSkill,
};
