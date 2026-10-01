import { Router } from "express";
import { body } from "express-validator";
import {
  listJobs,
  getJob,
  myJobs,
  listAllJobsForAdmin,
  createJob,
  updateJob,
  deleteJob,
  confirmJob,
  mySavedJobs,
  mySavedJobIds,
  saveJob,
  unsaveJob,
} from "../controllers/jobController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { objectIdParam, paginationQuery } from "../middleware/validators.js";
import { ATTACHMENT_TYPES } from "../constants/attachmentTypes.js";

const router = Router();

const JOB_BODY = [
  body("title").trim().notEmpty().isLength({ max: 200 }),
  body("description").optional().trim().isLength({ max: 5000 }),
  body("externalUrl").optional().trim().isURL().isLength({ max: 500 }),
  body("location").optional().trim().isLength({ max: 200 }),
  body("salary").optional().isFloat({ min: 0 }),
  body("expiredAt").optional().isISO8601(),
  body("category").optional().isMongoId(),
  body("attachmentRequests").optional().isArray(),
  body("attachmentRequests.*").optional().isIn(ATTACHMENT_TYPES),
  body("skills").optional().isArray(),
  body("skills.*").optional().isMongoId(),
];
const JOB_BODY_UPDATE = [
  body("title").optional().trim().notEmpty().isLength({ max: 200 }),
  body("description").optional().trim().isLength({ max: 5000 }),
  body("externalUrl").optional().trim().isURL().isLength({ max: 500 }),
  body("location").optional().trim().isLength({ max: 200 }),
  body("salary").optional().isFloat({ min: 0 }),
  body("status").optional().isIn(["open", "closed", "expired"]),
  body("expiredAt").optional().isISO8601(),
  body("category").optional().isMongoId(),
  body("attachmentRequests").optional().isArray(),
  body("attachmentRequests.*").optional().isIn(ATTACHMENT_TYPES),
  body("skills").optional().isArray(),
  body("skills.*").optional().isMongoId(),
];

router.get("/", [...paginationQuery()], validate, asyncHandler(listJobs));
router.get("/mine", verifyToken, requireRole("employer"), [...paginationQuery()], validate, asyncHandler(myJobs));
router.get(
  "/admin/all",
  verifyToken,
  requireRole("admin"),
  [...paginationQuery()],
  validate,
  asyncHandler(listAllJobsForAdmin)
);
router.get("/saved", verifyToken, requireRole("user"), asyncHandler(mySavedJobs));
router.get("/saved/ids", verifyToken, requireRole("user"), asyncHandler(mySavedJobIds));
router.post("/:id/save", verifyToken, requireRole("user"), [objectIdParam("id")], validate, asyncHandler(saveJob));
router.delete("/:id/save", verifyToken, requireRole("user"), [objectIdParam("id")], validate, asyncHandler(unsaveJob));
router.get("/:id", [objectIdParam("id")], validate, asyncHandler(getJob));

router.post("/", verifyToken, requireRole("employer"), JOB_BODY, validate, asyncHandler(createJob));
router.put(
  "/:id",
  verifyToken,
  requireRole("employer", "admin"),
  [objectIdParam("id"), ...JOB_BODY_UPDATE],
  validate,
  asyncHandler(updateJob)
);
router.delete("/:id", verifyToken, requireRole("employer", "admin"), [objectIdParam("id")], validate, asyncHandler(deleteJob));
router.put(
  "/:id/confirm",
  verifyToken,
  requireRole("admin"),
  [objectIdParam("id"), body("status").isIn(["verified", "rejected"])],
  validate,
  asyncHandler(confirmJob)
);

export default router;
