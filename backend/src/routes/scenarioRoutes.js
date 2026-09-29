import { Router } from "express";
import { body } from "express-validator";
import {
  listActiveScenarios,
  getActiveScenario,
  listAllScenarios,
  getScenario,
  createScenario,
  updateScenario,
  deleteScenario,
  attemptScenario,
  myScenarioAttempts,
} from "../controllers/scenarioController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { objectIdParam } from "../middleware/validators.js";

const router = Router();
const STAFF_ROLES = ["admin", "counsellor"];

router.get("/", verifyToken, requireRole("user"), asyncHandler(listActiveScenarios));
router.get("/all", verifyToken, requireRole(...STAFF_ROLES), asyncHandler(listAllScenarios));
router.get("/attempts/me", verifyToken, requireRole("user"), asyncHandler(myScenarioAttempts));
router.get("/:id/admin", verifyToken, requireRole(...STAFF_ROLES), [objectIdParam("id")], validate, asyncHandler(getScenario));
router.get("/:id", verifyToken, requireRole("user"), [objectIdParam("id")], validate, asyncHandler(getActiveScenario));
router.post("/", verifyToken, requireRole(...STAFF_ROLES), asyncHandler(createScenario));
router.put("/:id", verifyToken, requireRole(...STAFF_ROLES), [objectIdParam("id")], validate, asyncHandler(updateScenario));
router.delete("/:id", verifyToken, requireRole(...STAFF_ROLES), [objectIdParam("id")], validate, asyncHandler(deleteScenario));
router.post(
  "/:id/attempt",
  verifyToken,
  requireRole("user"),
  [objectIdParam("id"), body("chosenOptionIndex").isInt({ min: 0 })],
  validate,
  asyncHandler(attemptScenario)
);

export default router;
