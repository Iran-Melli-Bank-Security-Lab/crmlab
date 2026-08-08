import { PERMISSIONS, type Permission } from "@/constants/permissions";

export type ProjectTableColumnDataType =
  | "text"
  | "date"
  | "status"
  | "user"
  | "link"
  | "count"
  | "action";

export type ProjectTableColumnDefinition = {
  columnKey: string;
  defaultLabel: string;
  faLabel: string;
  dataType: ProjectTableColumnDataType;
  tableContexts: ProjectTableContext[];
  isConfigurable: boolean;
  isDefaultVisible: boolean;
  isMandatory: boolean;
  defaultOrder: number;
  sortable: boolean;
  filterable: boolean;
  minWidth?: string;
  maxWidth?: string;
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  applicableViews?: string[];
  isSensitive: boolean;
};

export type ColumnCatalogItem = Omit<
  ProjectTableColumnDefinition,
  "columnKey" | "tableContexts" | "defaultOrder" | "requiredPermission"
> & {
  sourceFields: string[];
};

const NON_ADMIN_PROJECT_READ_PERMISSIONS = [
  PERMISSIONS.SECURITY_PROJECTS_READ,
  PERMISSIONS.QUALITY_PROJECTS_READ,
  PERMISSIONS.PENTEST_PROJECTS_READ,
  PERMISSIONS.DEVOPS_PROJECTS_READ,
  PERMISSIONS.QA_PROJECTS_READ,
  PERMISSIONS.REPRESENTATIVE_PROJECTS_READ,
] satisfies Permission[];

const common: Pick<
  ColumnCatalogItem,
  "isConfigurable" | "isDefaultVisible" | "isMandatory" | "sortable" | "filterable" | "isSensitive"
> = {
  isConfigurable: true,
  isDefaultVisible: true,
  isMandatory: false,
  sortable: true,
  filterable: false,
  isSensitive: false,
};

function column(
  definition: Omit<ColumnCatalogItem, keyof typeof common> &
    Partial<Pick<ColumnCatalogItem, keyof typeof common>>
): ColumnCatalogItem {
  return { ...common, ...definition };
}

export const PROJECT_TABLE_COLUMN_CATALOG: Record<string, ColumnCatalogItem> = {
  title: column({
    defaultLabel: "Task", faLabel: "وظیفه", dataType: "text",
    minWidth: "240px", maxWidth: "360px", filterable: true, sourceFields: [],
  }),
  description: column({
    defaultLabel: "Description", faLabel: "توضیحات", dataType: "text",
    minWidth: "240px", maxWidth: "420px", filterable: true, sourceFields: [],
  }),
  deadline: column({
    defaultLabel: "Deadline", faLabel: "مهلت", dataType: "date",
    minWidth: "140px", sourceFields: [],
  }),
  updatedAt: column({
    defaultLabel: "Updated", faLabel: "به‌روزرسانی", dataType: "date",
    minWidth: "130px", sourceFields: [],
  }),
  summary: column({
    defaultLabel: "Project", faLabel: "پروژه", dataType: "text",
    minWidth: "260px", maxWidth: "360px",
    isMandatory: true, filterable: true, sourceFields: ["projectName"],
    requiredPermissions: NON_ADMIN_PROJECT_READ_PERMISSIONS,
  }),
  myResponsibilities: column({
    defaultLabel: "My Role", faLabel: "نقش من", dataType: "status",
    minWidth: "190px", maxWidth: "300px", sortable: false,
    sourceFields: [], requiredPermissions: NON_ADMIN_PROJECT_READ_PERMISSIONS,
  }),
  assignmentStatus: column({
    defaultLabel: "Assignment", faLabel: "تخصیص", dataType: "status",
    minWidth: "150px", sourceFields: [],
    requiredPermissions: [PERMISSIONS.QA_PROJECTS_READ],
  }),
  priority: column({
    defaultLabel: "Priority", faLabel: "اولویت", dataType: "status",
    minWidth: "120px", sourceFields: [],
    requiredPermissions: NON_ADMIN_PROJECT_READ_PERMISSIONS,
  }),
  scope: column({
    defaultLabel: "Scope", faLabel: "محدوده", dataType: "text",
    minWidth: "240px", maxWidth: "380px", sourceFields: [],
    requiredPermissions: [PERMISSIONS.PENTEST_PROJECTS_READ, PERMISSIONS.QA_PROJECTS_READ],
  }),
  phase: column({
    defaultLabel: "Phase", faLabel: "فاز", dataType: "text",
    minWidth: "160px", sourceFields: [],
    requiredPermissions: [PERMISSIONS.PENTEST_PROJECTS_READ, PERMISSIONS.QA_PROJECTS_READ],
  }),
  riskScore: column({
    defaultLabel: "Risk", faLabel: "ریسک", dataType: "count", minWidth: "90px",
    sourceFields: [], requiredPermissions: [
      PERMISSIONS.SECURITY_VULNERABILITIES_READ,
      PERMISSIONS.PENTEST_VULNERABILITIES_READ,
    ],
  }),
  vulnerabilities: column({
    defaultLabel: "Findings", faLabel: "یافته‌ها", dataType: "count", minWidth: "110px",
    sourceFields: [], requiredPermissions: [
      PERMISSIONS.SECURITY_VULNERABILITIES_READ,
      PERMISSIONS.PENTEST_VULNERABILITIES_READ,
      PERMISSIONS.QA_VULNERABILITIES_READ,
    ],
  }),
  securityBugs: column({
    defaultLabel: "Bug review", faLabel: "بازبینی باگ‌ها", dataType: "action",
    minWidth: "140px", maxWidth: "180px", sortable: false, sourceFields: [],
    requiredPermissions: [PERMISSIONS.SECURITY_VULNERABILITIES_READ],
  }),
  testCoverage: column({
    defaultLabel: "Coverage", faLabel: "پوشش", dataType: "count", minWidth: "130px",
    sourceFields: [], requiredPermissions: [
      PERMISSIONS.QUALITY_TEST_CASES_READ,
      PERMISSIONS.QA_TEST_CASES_READ,
    ],
  }),
  openBugs: column({
    defaultLabel: "Open bugs", faLabel: "باگ‌های باز", dataType: "count", minWidth: "120px",
    sourceFields: [], requiredPermissions: [
      PERMISSIONS.QUALITY_QA_READ,
      PERMISSIONS.QA_PROJECTS_READ,
    ],
  }),
  assignmentDueDate: column({
    defaultLabel: "Assignment due", faLabel: "مهلت تخصیص", dataType: "date",
    minWidth: "150px", sourceFields: [],
    requiredPermissions: [PERMISSIONS.PENTEST_PROJECTS_READ, PERMISSIONS.QA_PROJECTS_READ],
  }),
  progress: column({
    defaultLabel: "Progress", faLabel: "پیشرفت", dataType: "count", minWidth: "170px",
    sourceFields: [], requiredPermissions: [PERMISSIONS.PENTEST_PROJECTS_READ, PERMISSIONS.QA_PROJECTS_READ],
  }),
  status: column({
    defaultLabel: "Status", faLabel: "وضعیت", dataType: "status", minWidth: "130px",
    filterable: true, sourceFields: ["status"], requiredPermissions: [
      PERMISSIONS.PENTEST_PROJECTS_READ,
      PERMISSIONS.SECURITY_PROJECTS_READ,
      PERMISSIONS.QUALITY_PROJECTS_READ,
      PERMISSIONS.DEVOPS_PROJECTS_READ,
      PERMISSIONS.REPRESENTATIVE_PROJECTS_READ,
    ],
  }),
  provisioningStatus: column({
    defaultLabel: "DevOps status", faLabel: "وضعیت دواپس", dataType: "status",
    minWidth: "190px", filterable: true, isMandatory: true,
    sourceFields: ["provisioningStatus"],
    requiredPermissions: [
      PERMISSIONS.SECURITY_PROJECTS_READ,
      PERMISSIONS.QUALITY_PROJECTS_READ,
      PERMISSIONS.DEVOPS_PROJECTS_READ,
      PERMISSIONS.REPRESENTATIVE_PROJECTS_READ,
    ],
  }),
  projectManager: column({
    defaultLabel: "Project Manager", faLabel: "مدیر پروژه", dataType: "user",
    minWidth: "190px", sourceFields: ["projectManager", "qualityManager"],
    requiredPermissions: [PERMISSIONS.DEVOPS_PROJECTS_READ],
    isSensitive: true,
  }),
  labRepresentative: column({
    defaultLabel: "Lab Representative", faLabel: "نماینده آزمایشگاه", dataType: "user",
    minWidth: "190px", sourceFields: ["representative"],
    requiredPermissions: [PERMISSIONS.DEVOPS_PROJECTS_READ],
    isSensitive: true,
  }),
  devopsResponsible: column({
    defaultLabel: "DevOps Responsible", faLabel: "مسئول دواپس", dataType: "user",
    minWidth: "190px", sourceFields: ["devops"],
    requiredPermissions: [PERMISSIONS.REPRESENTATIVE_PROJECTS_READ],
    isSensitive: true,
  }),
  devopsFailureReason: column({
    defaultLabel: "Setup failure", faLabel: "علت شکست راه‌اندازی", dataType: "text",
    minWidth: "220px", maxWidth: "360px", sourceFields: ["devopsFailureReason"],
    requiredPermissions: [PERMISSIONS.REPRESENTATIVE_PROJECTS_READ],
  }),
  devopsFailureAt: column({
    defaultLabel: "Failure date", faLabel: "تاریخ شکست", dataType: "date",
    minWidth: "140px", sourceFields: ["devopsFailureAt"],
    requiredPermissions: [PERMISSIONS.REPRESENTATIVE_PROJECTS_READ],
  }),
  assignee: column({
    defaultLabel: "Assignee", faLabel: "مسئول", dataType: "user",
    minWidth: "180px", maxWidth: "260px", sourceFields: ["projectManager", "qualityManager", "devops"],
    requiredPermissions: [
      PERMISSIONS.SECURITY_PROJECTS_READ,
      PERMISSIONS.QUALITY_PROJECTS_READ,
      PERMISSIONS.REPRESENTATIVE_PROJECTS_READ,
    ],
    isSensitive: true,
  }),
  dueDate: column({
    defaultLabel: "Due", faLabel: "مهلت", dataType: "date", minWidth: "130px",
    sourceFields: ["testExpiresAt", "expireDay", "expireDayQuality"],
    requiredPermissions: [
      PERMISSIONS.SECURITY_PROJECTS_READ,
      PERMISSIONS.QUALITY_PROJECTS_READ,
      PERMISSIONS.DEVOPS_PROJECTS_READ,
      PERMISSIONS.REPRESENTATIVE_PROJECTS_READ,
    ],
  }),
  environment: column({
    defaultLabel: "Environment", faLabel: "محیط", dataType: "text",
    minWidth: "140px", maxWidth: "240px", sourceFields: ["devopsInfo.environment"],
    requiredPermissions: [PERMISSIONS.DEVOPS_DEPLOYMENTS_READ], isSensitive: true,
  }),
  repository: column({
    defaultLabel: "Repository", faLabel: "مخزن", dataType: "link",
    minWidth: "190px", maxWidth: "300px", sourceFields: ["devopsInfo.repository"],
    requiredPermissions: [PERMISSIONS.DEVOPS_DEPLOYMENTS_READ], isSensitive: true,
  }),
  pipeline: column({
    defaultLabel: "Pipeline", faLabel: "پایپ‌لاین", dataType: "link",
    minWidth: "150px", maxWidth: "240px", sourceFields: ["devopsInfo.pipeline"],
    requiredPermissions: [PERMISSIONS.DEVOPS_DEPLOYMENTS_READ], isSensitive: true,
  }),
  lastActivity: column({
    defaultLabel: "Updated", faLabel: "به‌روزرسانی", dataType: "date", minWidth: "130px",
    sourceFields: ["updatedAt", "createdAt", "created_date"],
    requiredPermissions: [PERMISSIONS.DEVOPS_PROJECTS_READ],
  }),
  projectGroupId: column({
    defaultLabel: "Group", faLabel: "گروه", dataType: "text", minWidth: "120px",
    sourceFields: ["projectGroupId"], requiredPermissions: [PERMISSIONS.REPRESENTATIVE_PROJECTS_READ],
  }),
  version: column({
    defaultLabel: "Version", faLabel: "نسخه", dataType: "text", minWidth: "110px",
    sourceFields: ["version"], requiredPermissions: [PERMISSIONS.REPRESENTATIVE_PROJECTS_READ],
  }),
  letterNumber: column({
    defaultLabel: "Letter", faLabel: "نامه", dataType: "text", minWidth: "150px",
    sourceFields: ["letterNumber"], requiredPermissions: [PERMISSIONS.REPRESENTATIVE_PROJECTS_READ],
    isSensitive: true,
  }),
  platform: column({
    defaultLabel: "Platform", faLabel: "پلتفرم", dataType: "text", minWidth: "120px",
    sourceFields: ["platform"], requiredPermissions: [PERMISSIONS.REPRESENTATIVE_PROJECTS_READ],
  }),
  discipline: column({
    defaultLabel: "Type", faLabel: "نوع", dataType: "status", minWidth: "130px",
    sourceFields: ["type", "projectType"], requiredPermissions: [PERMISSIONS.REPRESENTATIVE_PROJECTS_READ],
  }),
  owner: column({
    defaultLabel: "Owner", faLabel: "مالک", dataType: "user",
    minWidth: "190px", maxWidth: "260px", sourceFields: ["ownerId", "projectManager"],
    requiredPermissions: [PERMISSIONS.REPRESENTATIVE_PROJECTS_READ], isSensitive: true,
  }),
  testExpiresAt: column({
    defaultLabel: "Test expires", faLabel: "پایان اعتبار تست", dataType: "date", minWidth: "140px",
    sourceFields: ["testExpiresAt", "expireDay", "expireDayQuality"],
    requiredPermissions: [PERMISSIONS.REPRESENTATIVE_PROJECTS_READ],
  }),
  createdAt: column({
    defaultLabel: "Created", faLabel: "ایجاد شده", dataType: "date", minWidth: "130px",
    sourceFields: ["createdAt", "created_date"], requiredPermissions: [PERMISSIONS.REPRESENTATIVE_PROJECTS_READ],
  }),
  pentesters: column({
    defaultLabel: "Pentesters", faLabel: "تست‌کنندگان نفوذ", dataType: "action",
    minWidth: "150px", maxWidth: "190px", sortable: false, sourceFields: [],
    requiredPermissions: [PERMISSIONS.SECURITY_PROJECTS_ASSIGN], isSensitive: true,
  }),
};

const ADMIN_COLUMNS = [
  "summary", "projectGroupId", "version", "letterNumber", "platform", "discipline",
  "status", "owner", "assignee", "testExpiresAt", "createdAt",
] as const;

const USER_COLUMNS = [
  "summary",
  ...Object.keys(PROJECT_TABLE_COLUMN_CATALOG).filter(
    (key) => key !== "summary" &&
      !["title", "description", "deadline", "updatedAt"].includes(key)
  ),
];

export const PROJECT_TABLE_COLUMN_VIEWS: Record<string, string[]> = {
  summary: ["security", "pentest", "devops", "quality", "qa", "representative"],
  myResponsibilities: ["security", "pentest", "devops", "quality", "qa", "representative"],
  assignmentStatus: ["qa"],
  priority: ["security", "pentest", "devops", "quality", "qa"],
  scope: ["pentest", "qa"],
  phase: ["pentest", "qa"],
  riskScore: ["security", "pentest"],
  vulnerabilities: ["security", "pentest"],
  securityBugs: ["security"],
  testCoverage: ["quality", "qa"],
  openBugs: ["quality", "qa"],
  assignmentDueDate: ["pentest", "qa"],
  progress: ["pentest", "qa"],
  status: ["security", "pentest", "devops", "quality", "representative"],
  provisioningStatus: ["security", "devops", "quality", "representative"],
  projectManager: ["devops"],
  labRepresentative: ["devops"],
  devopsResponsible: ["representative"],
  devopsFailureReason: ["representative"],
  devopsFailureAt: ["representative"],
  assignee: ["security", "quality", "representative"],
  dueDate: ["security", "devops", "quality", "representative"],
  environment: ["devops"],
  repository: ["devops"],
  pipeline: ["devops"],
  lastActivity: ["devops"],
  projectGroupId: ["representative"],
  version: ["representative"],
  letterNumber: ["representative"],
  platform: ["representative"],
  discipline: ["representative"],
  owner: ["representative"],
  testExpiresAt: ["representative"],
  createdAt: ["representative"],
  pentesters: ["security"],
};

export const PROJECT_TABLE_CONTEXT_REGISTRY = {
  admin: {
    defaultLabel: "Admin", faLabel: "ادمین",
    requiredPermission: PERMISSIONS.ADMIN_SYSTEM_MANAGE,
    columns: ADMIN_COLUMNS,
  },
  "user-projects": {
    defaultLabel: "My Projects", faLabel: "پروژه‌های من", columns: USER_COLUMNS,
  },
  tasks: {
    defaultLabel: "Task Table", faLabel: "جدول وظایف",
    columns: ["title", "description", "assignee", "priority", "status", "deadline", "createdAt", "updatedAt"],
  },
} as const;

export type ProjectTableContext = keyof typeof PROJECT_TABLE_CONTEXT_REGISTRY;

export function hasAnyColumnPermission(
  definition: Pick<ProjectTableColumnDefinition, "requiredPermissions">,
  permissions: readonly Permission[]
) {
  return !definition.requiredPermissions?.length ||
    definition.requiredPermissions.some((permission) => permissions.includes(permission));
}

export function getProjectTableContextRequiredPermission(context: ProjectTableContext) {
  const config = PROJECT_TABLE_CONTEXT_REGISTRY[context];
  return "requiredPermission" in config ? config.requiredPermission : undefined;
}

export function getProjectTableColumnDefinitions(
  context: ProjectTableContext,
  permissions: readonly Permission[] = []
): ProjectTableColumnDefinition[] {
  const config = PROJECT_TABLE_CONTEXT_REGISTRY[context];
  return [...config.columns]
    .flatMap((columnKey, defaultOrder): ProjectTableColumnDefinition[] => {
      const catalogItem = PROJECT_TABLE_COLUMN_CATALOG[columnKey];
      if (!catalogItem) return [];
      const { sourceFields, requiredPermissions, ...publicDefinition } = catalogItem;
      void sourceFields;
      const definition: ProjectTableColumnDefinition = {
        columnKey,
        ...publicDefinition,
        ...(context !== "user-projects"
          ? { isConfigurable: true, isSensitive: false }
          : {}),
        tableContexts: [context],
        defaultOrder,
        requiredPermission: requiredPermissions?.length === 1 ? requiredPermissions[0] : undefined,
        requiredPermissions,
        ...(context === "user-projects"
          ? { applicableViews: PROJECT_TABLE_COLUMN_VIEWS[columnKey] || [] }
          : {}),
      };
      return [definition];
    })
    .filter((item) => context !== "user-projects" || hasAnyColumnPermission(item, permissions));
}

export function getProjectColumnSourceFields(columnKeys: readonly string[]) {
  return Array.from(new Set(columnKeys.flatMap((key) =>
    PROJECT_TABLE_COLUMN_CATALOG[key]?.sourceFields || []
  )));
}
