import { Router } from "express";
import { body } from "express-validator";
import {
  createRiskSituationLog,
  myRiskSituationLogs,
  getRiskSituationLogsForUser,
} from "../controllers/riskSituationController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { objectIdParam } from "../middleware/validators.js";

const router = Router();

router.get(
  "/me",
  verifyToken,
  requireRole("user"),
  asyncHandler(myRiskSituationLogs)
);
router.post(
  "/",
  verifyToken,
  requireRole("user"),
  [
    body("situation").trim().notEmpty().isLength({ max: 2000 }),
    body("skillUsed").isBoolean(),
    body("skillDescription").optional().trim().isLength({ max: 1000 }),
    body("outcome").isIn(["handled_well", "partially_handled", "relapsed"]),
    body("occurredAt").optional().isISO8601(),
  ],
  validate,
  asyncHandler(createRiskSituationLog)
);
router.get(
  "/:userId",
  verifyToken,
  requireRole("admin", "counsellor"),
  [objectIdParam("userId")],
  validate,
  asyncHandler(getRiskSituationLogsForUser)
);

export default router;
