import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { createShare, deleteShare, listShares, updateShare } from "../controllers/shareController";

const router = Router();

router.use(requireAuth);
router.get("/", listShares);
router.post("/", createShare);
router.patch("/:id", updateShare);
router.delete("/:id", deleteShare);

export default router;
