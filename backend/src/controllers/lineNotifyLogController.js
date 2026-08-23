import LineNotifyLog from "../models/LineNotifyLog.js";
import { createCrudController } from "./crudFactory.js";

const { getAll, getOne, create, update, remove } = createCrudController(LineNotifyLog);

export {
  getAll as getLineNotifyLogs,
  getOne as getLineNotifyLog,
  create as createLineNotifyLog,
  update as updateLineNotifyLog,
  remove as deleteLineNotifyLog,
};
