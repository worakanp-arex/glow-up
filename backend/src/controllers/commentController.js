import Comment from "../models/Comment.js";
import { createCrudController } from "./crudFactory.js";

const { getAll, getOne, create, update, remove } = createCrudController(Comment);

export {
  getAll as getComments,
  getOne as getComment,
  create as createComment,
  update as updateComment,
  remove as deleteComment,
};
