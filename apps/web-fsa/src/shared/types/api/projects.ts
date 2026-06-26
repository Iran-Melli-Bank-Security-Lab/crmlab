export type ProjectType = "security" | "quality";
export type ProjectPlatform = "web" | "mobile" | "desktop";
export type CertificateAuthority = "bank" | "afta" | "standards";

export type CreateProjectRequest = {
  projectName: string;
  sourceProjectId?: string;
  projectGroupId?: string;
  canonicalName?: string;
  version: string;
  letterNumber: string;
  type: ProjectType;
  platform: ProjectPlatform;
  certificateRequired: boolean;
  certificateAuthorities: CertificateAuthority[];
  projectManagerId: string;
  qualityManagerId?: string;
  devopsManagerId: string;
  representativeId?: string;
  testEndDate: string;
};

export type CreateProjectResponse = CreateProjectRequest & {
  id: string;
  createdAt: string;
};

export type ProjectListView =
  | "admin"
  | "security"
  | "pentest"
  | "devops"
  | "quality"
  | "qa"
  | "representative";

export type ApiProjectResponse = {
  id: string;
  _id?: string;
  projectName: string;
  projectGroupId?: string;
  canonicalName?: string;
  version?: string;
  letterNumber?: string;
  type?: ProjectType | "devops";
  platform?: ProjectPlatform[] | ProjectPlatform | string[] | string;
  status?: string;
  ownerId?: string;
  projectManager?: string;
  qualityManager?: string;
  devops?: string;
  representative?: string;
  assignedUserIds?: string[];
  expireDay?: string;
  expireDayQuality?: string;
  testExpiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
};
