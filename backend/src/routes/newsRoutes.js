import { Router } from "express";
import { getNews } from "../controllers/newsController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(getNews));

export default router;
