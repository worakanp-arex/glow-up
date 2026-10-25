import { Router } from "express";
import { body } from "express-validator";
import { getJobCategories, createJobCategory, updateJobCategory, deleteJobCategory } from "../controllers/jobCategoryController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { objectIdParam, paginationQuery } from "../middleware/validators.js";

const router = Router();

router.get("/", [...paginationQuery()], validate, asyncHandler(getJobCategories));
router.post(
  "/",
  verifyToken,
  requireRole("admin"),
  [body("name").trim().notEmpty().isLength({ max: 100 })],
  validate,
  asyncHandler(createJobCategory)
);

router.put(
  "/:id",
  verifyToken,
  requireRole("admin"),
  [objectIdParam("id"), body("name").trim().notEmpty().isLength({ max: 100 })],
  validate,
  asyncHandler(updateJobCategory)
);
router.delete("/:id", verifyToken, requireRole("admin"), [objectIdParam("id")], validate, asyncHandler(deleteJobCategory));

export default router;
