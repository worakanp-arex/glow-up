import AiMatchResult from "../models/AiMatchResult.js";
import { createCrudController } from "./crudFactory.js";

const { getAll, getOne, create, update, remove } = createCrudController(AiMatchResult);

export {
  getAll as getAiMatchResults,
  getOne as getAiMatchResult,
  create as createAiMatchResult,
  update as updateAiMatchResult,
  remove as deleteAiMatchResult,
};
