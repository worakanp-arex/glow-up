import Counsellor from "../models/Counsellor.js";
import { createCrudController } from "./crudFactory.js";

const { getAll, getOne, create, update, remove } = createCrudController(Counsellor);

export {
  getAll as getCounsellors,
  getOne as getCounsellor,
  create as createCounsellor,
  update as updateCounsellor,
  remove as deleteCounsellor,
};
