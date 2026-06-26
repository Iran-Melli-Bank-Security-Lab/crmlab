import { PERMISSIONS } from "@/entities/permission/model/permissions";
import type { Permission } from "@/shared/types";
import type { ProjectListView } from "@/shared/types/api/projects";

export type ProjectViewConfig = {
  id: ProjectListView;
  label: string;
  permissions: Permission[];
  title: string;
  description: string;
  tableTitle: string;
  canCreateFromExisting?: boolean;
};

export const projectViewRegistry: ProjectViewConfig[] = [
  {
    id: "admin",
    label: "Created",
    permissions: [PERMISSIONS.ADMIN_SYSTEM_MANAGE],
    title: "Created Projects",
    description:
      "Monitor the projects created by your admin account across delivery workspaces.",
    tableTitle: "My Created Projects",
    canCreateFromExisting: true,
  },
  {
    id: "security",
    label: "Security Management",
    permissions: [PERMISSIONS.SECURITY_PROJECTS_READ],
    title: "My Security Projects",
    description:
      "Security projects assigned to you for coordination, assignment, and review.",
    tableTitle: "Assigned Security Projects",
  },
  {
    id: "pentest",
    label: "Pentest",
    permissions: [PERMISSIONS.PENTEST_PROJECTS_READ],
    title: "Pentest Assignments",
    description:
      "Pentest project assignments directly assigned to your user account.",
    tableTitle: "My Pentest Assignments",
  },
  {
    id: "devops",
    label: "DevOps",
    permissions: [PERMISSIONS.DEVOPS_PROJECTS_READ],
    title: "My Delivery Projects",
    description:
      "Delivery projects assigned to you for environment, repository, and pipeline work.",
    tableTitle: "Assigned Delivery Projects",
  },
  {
    id: "quality",
    label: "Quality Management",
    permissions: [PERMISSIONS.QUALITY_PROJECTS_READ],
    title: "My Quality Projects",
    description:
      "Quality projects assigned to you for QA coordination, result review, and approval.",
    tableTitle: "Assigned Quality Projects",
  },
  {
    id: "qa",
    label: "QA",
    permissions: [PERMISSIONS.QA_PROJECTS_READ],
    title: "QA Assignments",
    description: "QA project assignments directly assigned to your user account.",
    tableTitle: "My QA Assignments",
  },
  {
    id: "representative",
    label: "Customer",
    permissions: [PERMISSIONS.REPRESENTATIVE_PROJECTS_READ],
    title: "My Customer Projects",
    description:
      "Customer-facing projects assigned to you for representation and communication.",
    tableTitle: "Assigned Customer Projects",
  },
];
