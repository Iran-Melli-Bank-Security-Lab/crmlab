import { isAllowedDevelopmentOrigin } from "@/constants/cors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import { env , isProduction} from "@/config/env";
import { ROUTES } from "@/constants/routes";
import { csrfProtection } from "@/middlewares/csrf.middleware";
import { errorHandler, notFoundHandler } from "@/middlewares/error.middleware";
import { sendSuccess } from "@/utils/response";

import auditRoutes from "@/modules/audit/routes/audit.routes";
import authRoutes from "@/modules/auth/routes/auth.routes";
import userRoutes from "@/modules/users/routes/user.routes";
import projectRoutes from "@/modules/projects/routes/project.routes";
import notificationRoutes from "@/modules/notifications/routes/notification.routes";
import uploadRoutes from "@/modules/uploads/routes/upload.routes";
import pentestRoutes from "@/modules/pentest/routes/pentest.routes";
import devopsRoutes from "@/modules/devops/routes/devops.routes";
import ticketRoutes from "@/modules/tickets/routes/ticket.routes";
import qaRoutes from "@/modules/qa/routes/qa.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  // app.use(
  //   cors({
  //     origin: env.clientUrls,
  //     credentials: true,
  //   })
  // );
  app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.clientUrls.includes(origin)) {
        callback(null, true);
        return;
      }

      if (!isProduction && isAllowedDevelopmentOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(csrfProtection);
  app.use(morgan("dev"));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 500 }));
  app.use(ROUTES.UPLOADS_STATIC, express.static(path.resolve(env.uploadDir)));

  app.get(ROUTES.HEALTH, (_req, res) => sendSuccess(res, { ok: true, service: "enterprise-dashboard-backend" }));

  app.use(ROUTES.AUTH.BASE, authRoutes);
  app.use(ROUTES.AUDIT_LOGS.BASE, auditRoutes);
  app.use(ROUTES.USERS.BASE, userRoutes);
  app.use(ROUTES.PROJECTS.BASE, projectRoutes);
  app.use(ROUTES.NOTIFICATIONS.BASE, notificationRoutes);
  app.use(ROUTES.UPLOAD.BASE, uploadRoutes);
  app.use(ROUTES.PENTEST.BASE, pentestRoutes);
  app.use(ROUTES.DEVOPS.BASE, devopsRoutes);
  app.use(ROUTES.TICKETS.BASE, ticketRoutes);
  app.use(ROUTES.QA.BASE, qaRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
