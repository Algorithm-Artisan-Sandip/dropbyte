import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { login, logout, me, metrics, register } from "../controllers/statusController";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
router.get("/metrics", requireAuth, metrics);

export default router;
