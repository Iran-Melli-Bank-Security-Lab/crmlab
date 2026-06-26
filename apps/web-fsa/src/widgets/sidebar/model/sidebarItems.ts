import { ROUTE_ACCESS_POLICIES } from "@/entities/permission/domain/accessPolicy";
import type { Permission } from "@/shared/types";
import type { TranslationKey } from "@/features/language/model";

export type SidebarItem = {
  icon: string;
  title: string;
  titleKey: TranslationKey;
  path: string;
  permissions: Permission[];
  section: string;
  sectionKey: TranslationKey;
};

export const sidebarItems: SidebarItem[] = [
  {
    icon: "users",
    title: "User Management",
    titleKey: "sidebar.userManagement",
    path: ROUTE_ACCESS_POLICIES.adminUsers.path,
    permissions: ROUTE_ACCESS_POLICIES.adminUsers.permissions,
    section: "Admin",
    sectionKey: "sidebar.admin",
  },
  {
    icon: "folder",
    title: "Projects",
    titleKey: "sidebar.projects",
    path: ROUTE_ACCESS_POLICIES.projects.path,
    permissions: ROUTE_ACCESS_POLICIES.projects.permissions,
    section: "Workspace",
    sectionKey: "sidebar.workspace",
  },
  {
    icon: "plus",
    title: "Create Project",
    titleKey: "sidebar.createProject",
    path: ROUTE_ACCESS_POLICIES.createProject.path,
    permissions: ROUTE_ACCESS_POLICIES.createProject.permissions,
    section: "Workspace",
    sectionKey: "sidebar.workspace",
  },
  {
    icon: "user",
    title: "Profile",
    titleKey: "sidebar.profile",
    path: ROUTE_ACCESS_POLICIES.profile.path,
    permissions: ROUTE_ACCESS_POLICIES.profile.permissions,
    section: "Account",
    sectionKey: "sidebar.account",
  },
  {
    icon: "settings",
    title: "Settings",
    titleKey: "sidebar.settings",
    path: ROUTE_ACCESS_POLICIES.settings.path,
    permissions: ROUTE_ACCESS_POLICIES.settings.permissions,
    section: "Account",
    sectionKey: "sidebar.account",
  },
];
