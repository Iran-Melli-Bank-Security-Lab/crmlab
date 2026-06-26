import fs from "node:fs/promises";
import path from "node:path";
import type { RequestHandler } from "express";
import { env } from "@/config/env";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/constants/audit";
import { HTTP_STATUS } from "@/constants/http";
import { UPLOADS } from "@/constants/uploads";
import { writeAuditLog } from "@/modules/audit/services/audit.service";
import { AppError } from "@/utils/AppError";
import { sendSuccess } from "@/utils/response";

type MulterFiles = Record<string, Express.Multer.File[]>;

function getUploadedAvatarFile(req: Parameters<RequestHandler>[0]) {
    const files = req.files as MulterFiles | undefined;

    return (
        req.file ||
        files?.[UPLOADS.AVATAR_FIELD_ALIAS]?.[0] ||
        files?.[UPLOADS.AVATAR_FIELD]?.[0]
    );
}

function safeUploadFilename(fileId: string) {
    const filename = path.basename(fileId);

    if (!filename || filename !== fileId) {
        throw new AppError("Invalid upload file id", HTTP_STATUS.BAD_REQUEST);
    }

    return filename;
}

export const uploadAvatar: RequestHandler = async (req, res, next) => {
    try {
        const file = getUploadedAvatarFile(req);

        if (!file) {
            throw new AppError("Avatar image is required", HTTP_STATUS.BAD_REQUEST);
        }

        const avatarUrl = UPLOADS.PUBLIC_PATH(file.filename);

        await writeAuditLog({
            req,
            action: AUDIT_ACTIONS.UPLOAD_AVATAR,
            entityType: AUDIT_ENTITY_TYPES.UPLOAD,
            entityId: file.filename,
            metadata: {
                filename: file.filename,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
            },
        });

        sendSuccess(
            res,
            {
                url: avatarUrl,
                fileId: file.filename,
                avatarUrl,
                user: null,
            },
            HTTP_STATUS.CREATED
        );
    } catch (error) {
        next(error);
    }
};

export const deleteUpload: RequestHandler = async (req, res, next) => {
    try {

        const uploadId = req.params.id;
        if (Array.isArray(uploadId)) {
            throw new AppError("Invalid upload file id", HTTP_STATUS.BAD_REQUEST);
        }
        const filename = safeUploadFilename(uploadId);
        const uploadRoot = path.resolve(env.uploadDir);
        const filePath = path.resolve(uploadRoot, filename);

        if (!filePath.startsWith(`${uploadRoot}${path.sep}`)) {
            throw new AppError("Invalid upload path", HTTP_STATUS.BAD_REQUEST);
        }

        try {
            await fs.unlink(filePath);
        } catch (error) {
            const nodeError = error as NodeJS.ErrnoException;

            if (nodeError.code !== "ENOENT") {
                throw error;
            }
        }

        await writeAuditLog({
            req,
            action: AUDIT_ACTIONS.UPLOAD_DELETE,
            entityType: AUDIT_ENTITY_TYPES.UPLOAD,
            entityId: filename,
            metadata: {
                filename,
            },
        });

        sendSuccess(res, {
            fileId: filename,
            deleted: true,
        });
    } catch (error) {
        next(error);
    }
};