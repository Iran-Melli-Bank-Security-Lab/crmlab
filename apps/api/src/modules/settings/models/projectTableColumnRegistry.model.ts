import { PERMISSIONS, type Permission } from "@/constants/permissions";

export type ProjectTableColumnDataType =
  | "text"
  | "date"
  | "status"
  | "user"
  | "link"
  | "count"
  | "action";

type ColumnCatalogItem = {
  defaultLabel: string;
  faLabel: string;
  dataType: ProjectTableColumnDataType;
  minWidth?: string;
  maxWidth?: string;
};

const COLUMN_CATALOG: Record<string, ColumnCatalogItem> = {
  summary: { defaultLabel: "Project", faLabel: "پروژه", dataType: "text", minWidth: "260px", maxWidth: "360px" },
  assignmentStatus: { defaultLabel: "Assignment", faLabel: "تخصیص", dataType: "status", minWidth: "150px" },
  priority: { defaultLabel: "Priority", faLabel: "اولویت", dataType: "status", minWidth: "120px" },
  scope: { defaultLabel: "Scope", faLabel: "محدوده", dataType: "text", minWidth: "240px", maxWidth: "380px" },
  phase: { defaultLabel: "Phase", faLabel: "فاز", dataType: "text", minWidth: "160px" },
  riskScore: { defaultLabel: "Risk", faLabel: "ریسک", dataType: "count", minWidth: "90px" },
  vulnerabilities: { defaultLabel: "Findings", faLabel: "یافته‌ها", dataType: "count", minWidth: "110px" },
  testCoverage: { defaultLabel: "Coverage", faLabel: "پوشش", dataType: "count", minWidth: "130px" },
  openBugs: { defaultLabel: "Open bugs", faLabel: "باگ‌های باز", dataType: "count", minWidth: "120px" },
  assignmentDueDate: { defaultLabel: "Assignment due", faLabel: "مهلت تخصیص", dataType: "date", minWidth: "150px" },
  progress: { defaultLabel: "Progress", faLabel: "پیشرفت", dataType: "count", minWidth: "170px" },
  status: { defaultLabel: "Status", faLabel: "وضعیت", dataType: "status", minWidth: "130px" },
  assignee: { defaultLabel: "Assignee", faLabel: "مسئول", dataType: "user", minWidth: "180px", maxWidth: "260px" },
  dueDate: { defaultLabel: "Due", faLabel: "مهلت", dataType: "date", minWidth: "130px" },
  environment: { defaultLabel: "Environment", faLabel: "محیط", dataType: "text", minWidth: "140px", maxWidth: "240px" },
  repository: { defaultLabel: "Repository", faLabel: "مخزن", dataType: "link", minWidth: "190px", maxWidth: "300px" },
  pipeline: { defaultLabel: "Pipeline", faLabel: "پایپ‌لاین", dataType: "link", minWidth: "150px", maxWidth: "240px" },
  lastActivity: { defaultLabel: "Updated", faLabel: "به‌روزرسانی", dataType: "date", minWidth: "130px" },
  projectGroupId: { defaultLabel: "Group", faLabel: "گروه", dataType: "text", minWidth: "120px" },
  version: { defaultLabel: "Version", faLabel: "نسخه", dataType: "text", minWidth: "110px" },
  letterNumber: { defaultLabel: "Letter", faLabel: "نامه", dataType: "text", minWidth: "150px" },
  platform: { defaultLabel: "Platform", faLabel: "پلتفرم", dataType: "text", minWidth: "120px" },
  discipline: { defaultLabel: "Type", faLabel: "نوع", dataType: "status", minWidth: "130px" },
  owner: { defaultLabel: "Owner", faLabel: "مالک", dataType: "user", minWidth: "190px", maxWidth: "260px" },
  testExpiresAt: { defaultLabel: "Test expires", faLabel: "پایان اعتبار تست", dataType: "date", minWidth: "140px" },
  createdAt: { defaultLabel: "Created", faLabel: "ایجاد شده", dataType: "date", minWidth: "130px" },
  assignedUserIds: { defaultLabel: "Pentesters", faLabel: "تست‌کنندگان نفوذ", dataType: "action", minWidth: "150px", maxWidth: "190px" },
};

export const PROJECT_TABLE_CONTEXT_REGISTRY = {
  admin: {
    defaultLabel: "Admin",
    faLabel: "ادمین",
    requiredPermission: PERMISSIONS.ADMIN_SYSTEM_MANAGE,
    columns: ["summary", "projectGroupId", "version", "letterNumber", "platform", "discipline", "status", "owner", "assignee", "testExpiresAt", "createdAt"],
  },
  "security-manager": {
    defaultLabel: "Security Management",
    faLabel: "مدیریت امنیت",
    requiredPermission: PERMISSIONS.SECURITY_PROJECTS_READ,
    columns: ["summary", "status", "priority", "assignee", "riskScore", "vulnerabilities", "dueDate", "assignedUserIds"],
  },
  pentest: {
    defaultLabel: "Pentest",
    faLabel: "تست نفوذ",
    requiredPermission: PERMISSIONS.PENTEST_PROJECTS_READ,
    columns: ["summary", "assignmentStatus", "priority", "scope", "phase", "riskScore", "vulnerabilities", "assignmentDueDate", "progress"],
  },
  devops: {
    defaultLabel: "DevOps",
    faLabel: "دواپس",
    requiredPermission: PERMISSIONS.DEVOPS_PROJECTS_READ,
    columns: ["summary", "status", "priority", "environment", "repository", "pipeline", "lastActivity"],
  },
  "quality-manager": {
    defaultLabel: "Quality Management",
    faLabel: "مدیریت کیفیت",
    requiredPermission: PERMISSIONS.QUALITY_PROJECTS_READ,
    columns: ["summary", "status", "priority", "assignee", "testCoverage", "openBugs", "dueDate"],
  },
  qa: {
    defaultLabel: "QA",
    faLabel: "تضمین کیفیت",
    requiredPermission: PERMISSIONS.QA_PROJECTS_READ,
    columns: ["summary", "assignmentStatus", "priority", "scope", "phase", "testCoverage", "openBugs", "assignmentDueDate", "progress"],
  },
  representative: {
    defaultLabel: "Customer",
    faLabel: "مشتری",
    requiredPermission: PERMISSIONS.REPRESENTATIVE_PROJECTS_READ,
    columns: ["summary", "projectGroupId", "version", "letterNumber", "platform", "discipline", "status", "owner", "assignee", "testExpiresAt", "createdAt"],
  },
} as const;

export type ProjectTableContext = keyof typeof PROJECT_TABLE_CONTEXT_REGISTRY;

export type ProjectTableColumnDefinition = ColumnCatalogItem & {
  columnKey: string;
  tableContexts: ProjectTableContext[];
  isConfigurable: true;
  isDefaultVisible: true;
  defaultOrder: number;
  requiredPermission: Permission;
  isSensitive: false;
};

export function getProjectTableColumnDefinitions(context: ProjectTableContext) {
  const config = PROJECT_TABLE_CONTEXT_REGISTRY[context];
  return config.columns.map((columnKey, defaultOrder): ProjectTableColumnDefinition => ({
    columnKey,
    ...COLUMN_CATALOG[columnKey],
    tableContexts: (Object.keys(PROJECT_TABLE_CONTEXT_REGISTRY) as ProjectTableContext[])
      .filter((candidate) => PROJECT_TABLE_CONTEXT_REGISTRY[candidate].columns.includes(columnKey as never)),
    isConfigurable: true,
    isDefaultVisible: true,
    defaultOrder,
    requiredPermission: config.requiredPermission,
    isSensitive: false,
  }));
}
