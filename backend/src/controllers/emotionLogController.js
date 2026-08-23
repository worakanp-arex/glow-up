import EmotionLog from "../models/EmotionLog.js";
import { createCrudController } from "./crudFactory.js";

const { getAll, getOne, create, update, remove } = createCrudController(EmotionLog);

export {
  getAll as getEmotionLogs,
  getOne as getEmotionLog,
  create as createEmotionLog,
  update as updateEmotionLog,
  remove as deleteEmotionLog,
};
