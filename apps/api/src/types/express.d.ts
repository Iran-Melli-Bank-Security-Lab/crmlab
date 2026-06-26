import type { Role } from "../constants/roles";
import type { Permission } from "../constants/permissions";
import type { ProjectDocument } from "../modules/projects/models/project.model";

declare global {
  namespace Express {
    interface UserContext {
      id: string;
      firstName: string;
      lastName: string;
      username: string;
      roles: Role[];
      permissions: Permission[];
      sessionVersion: number;
      projectIds?: string[];
    }

    interface Request {
      user?: UserContext;
      project?: ProjectDocument;
    }
  }
}

export {};
