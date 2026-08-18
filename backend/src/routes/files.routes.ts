import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { checkFileAccessPolicy } from "../middleware/checkFileAccessPolicy.middleware";
import { chunkUpload } from "../middleware/chunkUpload.middleware";
import {
  abortUpload,
  completePart,
  completeUpload,
  downloadFile,
  getPartUrl,
  initUpload,
  listFiles,
  markInterrupted,
  resumeUpload,
} from "../controllers/fileUploadController";

const router = Router();

router.use(requireAuth);
router.get("/", listFiles);
router.post("/init", initUpload);
router.get("/:id/resume", checkFileAccessPolicy("read"), resumeUpload);
router.get("/:id/part-url/:partNumber", checkFileAccessPolicy("write"), chunkUpload, getPartUrl);
router.post("/:id/parts", checkFileAccessPolicy("write"), chunkUpload, completePart);
router.post("/:id/complete", checkFileAccessPolicy("write"), completeUpload);
router.post("/:id/abort", checkFileAccessPolicy("write"), abortUpload);
router.post("/:id/interrupt", checkFileAccessPolicy("write"), markInterrupted);
router.get("/:id/download", checkFileAccessPolicy("download"), downloadFile);

export default router;
