import CounsellingSession from "../models/CounsellingSession.js";
import { createCrudController } from "./crudFactory.js";

const { getAll, getOne, create, update, remove } = createCrudController(CounsellingSession);

export {
  getAll as getCounsellingSessions,
  getOne as getCounsellingSession,
  create as createCounsellingSession,
  update as updateCounsellingSession,
  remove as deleteCounsellingSession,
};
