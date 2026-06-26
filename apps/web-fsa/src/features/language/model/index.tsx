import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type Language = "en" | "fa";

export type TranslationKey =
  | "app.name"
  | "common.active"
  | "common.inactive"
  | "common.language"
  | "common.loading"
  | "common.noUsers"
  | "common.open"
  | "common.read"
  | "common.saveAccess"
  | "common.user"
  | "languages.en"
  | "languages.fa"
  | "nav.toggleSidebar"
  | "nav.logout"
  | "nav.loggedOut"
  | "nav.console"
  | "notifications.aria"
  | "notifications.emptyDescription"
  | "notifications.emptyTitle"
  | "notifications.markAllRead"
  | "notifications.realtimeStatus"
  | "notifications.title"
  | "sidebar.account"
  | "sidebar.admin"
  | "sidebar.createProject"
  | "sidebar.dashboard"
  | "sidebar.dashboards"
  | "sidebar.profile"
  | "sidebar.projects"
  | "sidebar.roleDevops"
  | "sidebar.rolePentester"
  | "sidebar.roleQa"
  | "sidebar.roleQualityManager"
  | "sidebar.roleRepresentative"
  | "sidebar.roleSecurityManager"
  | "sidebar.settings"
  | "sidebar.userManagement"
  | "sidebar.workspace"
  | "userAccess.directPermissions"
  | "userAccess.empty"
  | "userAccess.permissionsHelp"
  | "userAccess.roles"
  | "userAccess.saveError"
  | "userAccess.saveSuccess"
  | "userAccess.title"
  | "userAccess.userState"
  | "userAccess.users"
  | "projectCreate.actions.cancel"
  | "projectCreate.actions.submit"
  | "projectCreate.description"
  | "projectCreate.fields.client"
  | "projectCreate.fields.discipline"
  | "projectCreate.fields.dueDate"
  | "projectCreate.fields.environment"
  | "projectCreate.fields.name"
  | "projectCreate.fields.owner"
  | "projectCreate.fields.priority"
  | "projectCreate.fields.repository"
  | "projectCreate.fields.scope"
  | "projectCreate.help"
  | "projectCreate.options.devops"
  | "projectCreate.options.high"
  | "projectCreate.options.low"
  | "projectCreate.options.medium"
  | "projectCreate.options.platform"
  | "projectCreate.options.quality"
  | "projectCreate.options.security"
  | "projectCreate.sections.delivery"
  | "projectCreate.sections.identity"
  | "projectCreate.success"
  | "projectCreate.title";

const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    "app.name": "Security Platform",
    "common.active": "Active",
    "common.inactive": "Inactive",
    "common.language": "Language",
    "common.loading": "Loading...",
    "common.noUsers": "No users available.",
    "common.open": "Open",
    "common.read": "Read",
    "common.saveAccess": "Save Access",
    "common.user": "User",
    "languages.en": "English",
    "languages.fa": "فارسی",
    "nav.toggleSidebar": "Toggle sidebar",
    "nav.logout": "Logout",
    "nav.loggedOut": "Logged out successfully",
    "nav.console": "Enterprise Console",
    "notifications.aria": "Notifications, {count} unread",
    "notifications.emptyDescription":
      "New project, review, report, and system events will appear here.",
    "notifications.emptyTitle": "No notifications",
    "notifications.markAllRead": "Mark all read",
    "notifications.realtimeStatus": "Realtime status: {status}",
    "notifications.title": "Notifications",
    "sidebar.account": "Account",
    "sidebar.admin": "Admin",
    "sidebar.createProject": "Create Project",
    "sidebar.dashboard": "Dashboard",
    "sidebar.dashboards": "Dashboards",
    "sidebar.profile": "Profile",
    "sidebar.projects": "Projects",
    "sidebar.roleDevops": "DevOps",
    "sidebar.rolePentester": "Pentester",
    "sidebar.roleQa": "Quality Assurance",
    "sidebar.roleQualityManager": "Quality Manager",
    "sidebar.roleRepresentative": "Representative",
    "sidebar.roleSecurityManager": "Security Manager",
    "sidebar.settings": "Settings",
    "sidebar.userManagement": "User Management",
    "sidebar.workspace": "Workspace",
    "userAccess.directPermissions": "Permissions",
    "userAccess.empty": "No users available.",
    "userAccess.permissionsHelp":
      "Role changes auto-fill permissions from the role catalog. Saved permissions are the source of truth.",
    "userAccess.roles": "Roles",
    "userAccess.saveError": "Failed to update user",
    "userAccess.saveSuccess": "User access updated",
    "userAccess.title": "User Access Management",
    "userAccess.userState": "User State",
    "userAccess.users": "Users",
    "projectCreate.actions.cancel": "Cancel",
    "projectCreate.actions.submit": "Create Project",
    "projectCreate.description":
      "Create a new project workspace for security, quality, DevOps, or platform delivery.",
    "projectCreate.fields.client": "Client",
    "projectCreate.fields.discipline": "Discipline",
    "projectCreate.fields.dueDate": "Due date",
    "projectCreate.fields.environment": "Environment",
    "projectCreate.fields.name": "Project name",
    "projectCreate.fields.owner": "Owner",
    "projectCreate.fields.priority": "Priority",
    "projectCreate.fields.repository": "Repository",
    "projectCreate.fields.scope": "Scope",
    "projectCreate.help":
      "Only administrators can create projects. Assignment and review workflows can be handled after the project exists.",
    "projectCreate.options.devops": "DevOps",
    "projectCreate.options.high": "High",
    "projectCreate.options.low": "Low",
    "projectCreate.options.medium": "Medium",
    "projectCreate.options.platform": "Platform",
    "projectCreate.options.quality": "Quality",
    "projectCreate.options.security": "Security",
    "projectCreate.sections.delivery": "Delivery details",
    "projectCreate.sections.identity": "Project identity",
    "projectCreate.success": "Project draft created",
    "projectCreate.title": "Create Project",
  },
  fa: {
    "app.name": "سامانه امنیت",
    "common.active": "فعال",
    "common.inactive": "غیرفعال",
    "common.language": "زبان",
    "common.loading": "در حال بارگذاری...",
    "common.noUsers": "کاربری موجود نیست.",
    "common.open": "باز کردن",
    "common.read": "خوانده شد",
    "common.saveAccess": "ذخیره دسترسی",
    "common.user": "کاربر",
    "languages.en": "English",
    "languages.fa": "فارسی",
    "nav.toggleSidebar": "باز و بسته کردن منو",
    "nav.logout": "خروج",
    "nav.loggedOut": "با موفقیت خارج شدید",
    "nav.console": "کنسول سازمانی",
    "notifications.aria": "اعلان ها، {count} خوانده نشده",
    "notifications.emptyDescription":
      "رویدادهای پروژه، بازبینی، گزارش و سیستم اینجا نمایش داده می شوند.",
    "notifications.emptyTitle": "اعلانی وجود ندارد",
    "notifications.markAllRead": "همه خوانده شد",
    "notifications.realtimeStatus": "وضعیت زنده: {status}",
    "notifications.title": "اعلان ها",
    "sidebar.account": "حساب کاربری",
    "sidebar.admin": "مدیریت",
    "sidebar.createProject": "ایجاد پروژه",
    "sidebar.dashboard": "داشبورد",
    "sidebar.dashboards": "داشبوردها",
    "sidebar.profile": "پروفایل",
    "sidebar.projects": "پروژه ها",
    "sidebar.roleDevops": "دواپس",
    "sidebar.rolePentester": "تست نفوذ",
    "sidebar.roleQa": "کنترل کیفیت",
    "sidebar.roleQualityManager": "مدیر کیفیت",
    "sidebar.roleRepresentative": "نماینده",
    "sidebar.roleSecurityManager": "مدیر امنیت",
    "sidebar.settings": "تنظیمات",
    "sidebar.userManagement": "مدیریت کاربران",
    "sidebar.workspace": "فضای کاری",
    "userAccess.directPermissions": "دسترسی ها",
    "userAccess.empty": "کاربری موجود نیست.",
    "userAccess.permissionsHelp":
      "تغییر نقش ها دسترسی ها را از فهرست نقش ها پر می کند. دسترسی های ذخیره شده منبع اصلی هستند.",
    "userAccess.roles": "نقش ها",
    "userAccess.saveError": "به روزرسانی کاربر ناموفق بود",
    "userAccess.saveSuccess": "دسترسی کاربر به روز شد",
    "userAccess.title": "مدیریت دسترسی کاربر",
    "userAccess.userState": "وضعیت کاربر",
    "userAccess.users": "کاربران",
    "projectCreate.actions.cancel": "انصراف",
    "projectCreate.actions.submit": "ایجاد پروژه",
    "projectCreate.description":
      "یک فضای کاری پروژه برای امنیت، کیفیت، دواپس یا تحویل پلتفرم ایجاد کنید.",
    "projectCreate.fields.client": "کارفرما",
    "projectCreate.fields.discipline": "حوزه",
    "projectCreate.fields.dueDate": "تاریخ سررسید",
    "projectCreate.fields.environment": "محیط",
    "projectCreate.fields.name": "نام پروژه",
    "projectCreate.fields.owner": "مالک",
    "projectCreate.fields.priority": "اولویت",
    "projectCreate.fields.repository": "مخزن کد",
    "projectCreate.fields.scope": "محدوده",
    "projectCreate.help":
      "فقط مدیران اصلی می توانند پروژه ایجاد کنند. تخصیص و بازبینی بعد از ایجاد پروژه انجام می شود.",
    "projectCreate.options.devops": "دواپس",
    "projectCreate.options.high": "زیاد",
    "projectCreate.options.low": "کم",
    "projectCreate.options.medium": "متوسط",
    "projectCreate.options.platform": "پلتفرم",
    "projectCreate.options.quality": "کیفیت",
    "projectCreate.options.security": "امنیت",
    "projectCreate.sections.delivery": "جزئیات تحویل",
    "projectCreate.sections.identity": "مشخصات پروژه",
    "projectCreate.success": "پیش نویس پروژه ایجاد شد",
    "projectCreate.title": "ایجاد پروژه",
  },
};

type Interpolation = Record<string, string | number>;

type LanguageContextValue = {
  dir: "ltr" | "rtl";
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, values?: Interpolation) => string;
};

const fallbackContext: LanguageContextValue = {
  dir: "ltr",
  language: "en",
  setLanguage: () => {},
  t: (key) => translations.en[key],
};

const LanguageContext = createContext<LanguageContextValue>(fallbackContext);
const storageKey = "app-language";

function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === "fa" || saved === "en") return saved;
  } catch {
    // English remains the default if storage is unavailable.
  }
  return "en";
}

function interpolate(value: string, values?: Interpolation) {
  if (!values) return value;
  return Object.entries(values).reduce(
    (text, [key, replacement]) => text.split(`{${key}}`).join(String(replacement)),
    value
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);
  const dir = language === "fa" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    document.body.dir = dir;
    try {
      localStorage.setItem(storageKey, language);
    } catch {
      // Language still works for the current session.
    }
  }, [dir, language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      dir,
      language,
      setLanguage: setLanguageState,
      t: (key, values) =>
        interpolate(translations[language][key] || translations.en[key], values),
    }),
    [dir, language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
