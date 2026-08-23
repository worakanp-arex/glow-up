import UserCourse from "../models/UserCourse.js";
import { createCrudController } from "./crudFactory.js";

const { getAll, getOne, create, update, remove } = createCrudController(UserCourse);

export {
  getAll as getUserCourses,
  getOne as getUserCourse,
  create as createUserCourse,
  update as updateUserCourse,
  remove as deleteUserCourse,
};
