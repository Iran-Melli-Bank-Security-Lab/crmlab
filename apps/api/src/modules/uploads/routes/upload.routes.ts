import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { env } from "@/config/env";
import { HTTP_STATUS } from "@/constants/http";
import { ROUTES } from "@/constants/routes";
import { UPLOADS } from "@/constants/uploads";
import { requireAuth } from "@/middlewares/auth.middleware";
import { AppError } from "@/utils/AppError";
import { deleteUpload, uploadAvatar } from "../controllers/upload.controller";

const router = Router();

fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, env.uploadDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: UPLOADS.MAX_IMAGE_SIZE_BYTES,
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith(UPLOADS.IMAGE_MIME_PREFIX)) {
      callback(new AppError("Only image files are allowed", HTTP_STATUS.BAD_REQUEST));
      return;
    }

    callback(null, true);
  },
});

const avatarUpload = upload.fields([
  { name: UPLOADS.AVATAR_FIELD, maxCount: 1 },
  { name: UPLOADS.AVATAR_FIELD_ALIAS, maxCount: 1 },
]);

router.post(ROUTES.UPLOAD.AVATAR, avatarUpload, uploadAvatar);
router.delete(ROUTES.PARAM_ID, requireAuth, deleteUpload);

export default router;