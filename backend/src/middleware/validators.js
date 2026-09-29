import { param, query } from "express-validator";

export function objectIdParam(name) {
  return param(name).isMongoId().withMessage(`${name} must be a valid id`);
}

export function paginationQuery() {
  return [
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("limit must be between 1 and 50"),
  ];
}
