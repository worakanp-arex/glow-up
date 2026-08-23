import RehabilitationRecord from "../models/RehabilitationRecord.js";
import { createCrudController } from "./crudFactory.js";

const { getAll, getOne, create, update, remove } = createCrudController(RehabilitationRecord);

export {
  getAll as getRehabilitationRecords,
  getOne as getRehabilitationRecord,
  create as createRehabilitationRecord,
  update as updateRehabilitationRecord,
  remove as deleteRehabilitationRecord,
};
