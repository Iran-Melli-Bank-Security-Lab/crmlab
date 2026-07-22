import { PERMISSIONS, type Permission } from "@role-dashboard/authz";
import type { ProjectRowActionContract } from "./projectTable.js";

export type ProjectResponsibilityIcon =
  | "crown"
  | "flask"
  | "gear"
  | "representative"
  | "shield"
  | "test"
  | "user-check";

export type ProjectResponsibilityColor =
  | "blue"
  | "cyan"
  | "gray"
  | "green"
  | "orange"
  | "purple"
  | "red"
  | "teal";

export type ProjectResponsibilityDefinition = {
  key: string;
  assignmentRoles: readonly string[];
  defaultLabel: string;
  faLabel: string;
  shortLabel: string;
  faShortLabel: string;
  icon: ProjectResponsibilityIcon;
  colorPalette: ProjectResponsibilityColor;
  order: number;
  projectViews: readonly string[];
  projectTypes?: readonly string[];
  legacyProjectFields?: readonly string[];
  readPermissions: readonly Permission[];
  actions: Partial<Record<ProjectRowActionContract, readonly Permission[]>>;
};

const viewAction = (permissions: readonly Permission[]) => ({
  "view-project": permissions,
});

const projectResponsibilityDefinitions = [
  {
    key: "pentester",
    assignmentRoles: ["pentester"],
    defaultLabel: "Pentester",
    faLabel: "تست‌کننده نفوذ",
    shortLabel: "Pentest",
    faShortLabel: "نفوذ",
    icon: "flask",
    colorPalette: "red",
    order: 10,
    projectViews: ["pentest"],
    legacyProjectFields: ["assignedUserIds"],
    readPermissions: [PERMISSIONS.PENTEST_PROJECTS_READ],
    actions: {
      ...viewAction([PERMISSIONS.PENTEST_PROJECTS_READ]),
      "open-pentest-workspace": [PERMISSIONS.PENTEST_PROJECTS_READ],
    },
  },
  {
    key: "qa",
    assignmentRoles: ["qa"],
    defaultLabel: "QA",
    faLabel: "تضمین کیفیت",
    shortLabel: "QA",
    faShortLabel: "کیفیت",
    icon: "test",
    colorPalette: "purple",
    order: 20,
    projectViews: ["qa"],
    readPermissions: [PERMISSIONS.QA_PROJECTS_READ],
    actions: viewAction([PERMISSIONS.QA_PROJECTS_READ]),
  },
  {
    key: "devops",
    assignmentRoles: ["devops"],
    defaultLabel: "DevOps",
    faLabel: "کارشناس دواپس",
    shortLabel: "DevOps",
    faShortLabel: "دواپس",
    icon: "gear",
    colorPalette: "cyan",
    order: 30,
    projectViews: ["devops"],
    readPermissions: [PERMISSIONS.DEVOPS_PROJECTS_READ],
    actions: viewAction([PERMISSIONS.DEVOPS_PROJECTS_READ]),
  },
  {
    key: "security_manager",
    assignmentRoles: ["security_manager", "manager"],
    defaultLabel: "Security Project Manager",
    faLabel: "مدیر پروژه امنیت",
    shortLabel: "Security PM",
    faShortLabel: "مدیر امنیت",
    icon: "shield",
    colorPalette: "blue",
    order: 40,
    projectViews: ["security"],
    projectTypes: ["security"],
    legacyProjectFields: ["projectManager"],
    readPermissions: [PERMISSIONS.SECURITY_PROJECTS_READ],
    actions: {
      ...viewAction([PERMISSIONS.SECURITY_PROJECTS_READ]),
      "assign-pentesters": [PERMISSIONS.SECURITY_PROJECTS_ASSIGN],
    },
  },
  {
    key: "quality_manager",
    assignmentRoles: ["quality_manager", "manager"],
    defaultLabel: "Quality Project Manager",
    faLabel: "مدیر پروژه کیفیت",
    shortLabel: "Quality PM",
    faShortLabel: "مدیر کیفیت",
    icon: "user-check",
    colorPalette: "green",
    order: 50,
    projectViews: ["quality"],
    projectTypes: ["quality"],
    legacyProjectFields: ["qualityManager", "projectManager"],
    readPermissions: [PERMISSIONS.QUALITY_PROJECTS_READ],
    actions: viewAction([PERMISSIONS.QUALITY_PROJECTS_READ]),
  },
  {
    key: "devops_manager",
    assignmentRoles: ["devops_manager"],
    defaultLabel: "DevOps Manager",
    faLabel: "مدیر دواپس",
    shortLabel: "DevOps Lead",
    faShortLabel: "مدیر دواپس",
    icon: "gear",
    colorPalette: "orange",
    order: 60,
    projectViews: ["devops"],
    legacyProjectFields: ["devops"],
    readPermissions: [PERMISSIONS.DEVOPS_PROJECTS_READ],
    actions: viewAction([PERMISSIONS.DEVOPS_PROJECTS_READ]),
  },
  {
    key: "representative",
    assignmentRoles: ["representative"],
    defaultLabel: "Lab Representative",
    faLabel: "نماینده آزمایشگاه",
    shortLabel: "Representative",
    faShortLabel: "نماینده",
    icon: "representative",
    colorPalette: "teal",
    order: 70,
    projectViews: ["representative"],
    legacyProjectFields: ["representative"],
    readPermissions: [PERMISSIONS.REPRESENTATIVE_PROJECTS_READ],
    actions: viewAction([PERMISSIONS.REPRESENTATIVE_PROJECTS_READ]),
  },
  {
    key: "admin",
    assignmentRoles: ["admin"],
    defaultLabel: "Project Administrator",
    faLabel: "مدیر سامانه پروژه",
    shortLabel: "Admin",
    faShortLabel: "مدیر سامانه",
    icon: "crown",
    colorPalette: "gray",
    order: 80,
    projectViews: ["admin"],
    readPermissions: [PERMISSIONS.ADMIN_SYSTEM_MANAGE],
    actions: viewAction([PERMISSIONS.ADMIN_SYSTEM_MANAGE]),
  },
] as const satisfies readonly ProjectResponsibilityDefinition[];

export type ProjectResponsibilityKey =
  (typeof projectResponsibilityDefinitions)[number]["key"];

export const PROJECT_RESPONSIBILITY_REGISTRY:
  readonly ProjectResponsibilityDefinition[] = projectResponsibilityDefinitions;

export const PROJECT_RESPONSIBILITY_BY_KEY = Object.fromEntries(
  PROJECT_RESPONSIBILITY_REGISTRY.map((definition) => [definition.key, definition])
) as Record<ProjectResponsibilityKey, ProjectResponsibilityDefinition>;
