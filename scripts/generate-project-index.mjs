#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, posix, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const jsonPath = resolve(root, ".codex/project-index.json");
const markdownPath = resolve(root, "docs/PROJECT_INDEX.md");
const checkOnly = process.argv.includes("--check");
const forceFull = process.argv.includes("--full");
const schemaVersion = 1;
const generatorVersion = 2;

const excludedSegments = new Set([
  ".git", ".cache", ".codex", "cache", "coverage", "dist", "logs",
  "node_modules", "upload", "uploads",
]);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);
const rootConfigs = new Set([
  ".env.example", ".eslintrc.cjs", ".gitignore", ".prettierrc",
  "ecosystem.config.cjs", "ecosystem.https.config.cjs", "eslint.config.js",
  "package.json", "package-lock.json", "tsconfig.base.json", "tsconfig.json",
]);

const domainDefinitions = [
  ["projects-assignments-settings", "Projects, assignments, responsibility/capability rules, security scopes, and configurable project tables."],
  ["pentest-security-standards", "Pentest workspaces, findings, POC files, assessments, CVSS, and security-standard trees."],
  ["auth-users-permissions", "Authentication, sessions, users, roles, permissions, access policies, and authorization registries."],
  ["notifications-realtime", "Persistent/browser notifications, Socket.IO delivery, rooms, and client synchronization."],
  ["devops", "Project DevOps information, encrypted credentials, deployments, servers, and workspace UI."],
  ["qa-quality", "QA and quality project workflows, test cases, and role-specific views."],
  ["tasks-tickets-audit-uploads", "Tasks, representative tickets, audit logs, avatars, and shared uploads."],
  ["frontend-shell-ui", "React startup, routes, layouts, dashboard, localization, theme, stores, and shared UI."],
  ["backend-platform", "Express startup, environment, middleware, constants, database, utilities, and server types."],
  ["contracts-packages", "Shared authorization runtime and frontend/backend API contracts."],
  ["legacy-compatibility", "Legacy MongoDB collections, normalization, compatibility services, diagnostics, and migration docs."],
  ["configuration-deployment", "Workspace builds, PM2, Nginx, HTTPS setup, and operational documentation."],
  ["repository-tooling", "Repository guidance and persistent Codex navigation tooling."],
];

const descriptions = {
  "apps/api/src/server.ts": "Backend process entrypoint; connects MongoDB, prepares indexes, and starts HTTP/Socket.IO.",
  "apps/api/src/app/app.ts": "Creates Express and mounts global middleware plus every API router.",
  "apps/api/src/constants/routes.ts": "Canonical backend route fragments and selected complete API endpoints.",
  "apps/api/src/config/uploadStorage.ts": "Resolves absolute upload roots and safe project/POC paths.",
  "apps/api/src/middlewares/projectAccess.middleware.ts": "Enforces project visibility and row capabilities from active assignments.",
  "apps/api/src/modules/projects/controllers/project.controller.ts": "Project list/detail/create and assignment handlers with notifications and compatibility mapping.",
  "apps/api/src/modules/projects/models/project.model.ts": "Project schema with canonical and legacy fields plus indexes.",
  "apps/api/src/modules/projects/models/projectAssignment.model.ts": "ProjectAssignment/legacy ProjectUser schema, role identity, scopes, and indexes.",
  "apps/api/src/modules/projects/services/projectResponsibility.service.ts": "Resolves project-specific responsibilities and capabilities from the shared registry.",
  "apps/api/src/modules/projects/services/projectTableCapability.service.ts": "Authorizes project columns, views, projections, sorting, filters, and row actions.",
  "apps/api/src/modules/settings/models/projectTableColumnRegistry.model.ts": "Backend-owned column catalog with permissions, views, labels, order, and source fields.",
  "apps/api/src/modules/settings/services/projectTableSetting.service.ts": "Validates per-user column visibility, ordering, and aliases.",
  "apps/api/src/modules/pentest/services/assignedSecurityStandard.service.ts": "Loads assigned standards and assessments using active pentester assignments.",
  "apps/api/src/modules/pentest/middlewares/pocUpload.middleware.ts": "Secures multipart POC uploads and normalizes vulnerability bodies.",
  "apps/api/src/db/legacyCompatibility.ts": "Repairs and verifies legacy database indexes and invariants.",
  "apps/web-fsa/src/app/main.tsx": "Browser entrypoint that mounts React.",
  "apps/web-fsa/src/app/router/AppRoutes.tsx": "Top-level public/protected React Router tree.",
  "apps/web-fsa/src/app/router/protectedRouteConfig.ts": "Lazy protected page registry tied to route permissions.",
  "apps/web-fsa/src/app/store/store.ts": "Redux store and RTK Query middleware configuration.",
  "apps/web-fsa/src/shared/api/baseApi.ts": "RTK Query base API with cookies, CSRF, and refresh-token retry.",
  "apps/web-fsa/src/entities/project/api/projectsApi.ts": "Project/assignment/scope API client and legacy response normalization.",
  "apps/web-fsa/src/entities/project/ui/assignment/PentesterAssignmentDock.tsx": "Security-manager UI for pentester and testing-scope assignment.",
  "apps/web-fsa/src/entities/project/ui/table/ProjectTableBase.tsx": "Configurable project table with filtering, sorting, pagination, and row actions.",
  "apps/web-fsa/src/entities/project/ui/table/columns.tsx": "Frontend renderers matching the backend project column registry.",
  "apps/web-fsa/src/pages/projects/Projects.tsx": "Projects page selecting admin/user tables and owning assignment UI.",
  "apps/web-fsa/src/pages/pentest-workspace/PentestWorkspacePage.tsx": "Assignment-aware route page for the pentest workspace.",
  "apps/web-fsa/src/features/ui-state/api/projectTableSettingsApi.ts": "Project table registry/settings API and Redux hydration hook.",
  "apps/web-fsa/src/features/ui-state/model/uiSlice.ts": "Client state for column visibility, order, aliases, and table preferences.",
  "apps/web-fsa/src/entities/permission/domain/accessPolicy.ts": "Central frontend route and dashboard permission policy.",
  "apps/web-fsa/src/features/notifications/realtime/NotificationSync.tsx": "Connects realtime events to state and API cache invalidation.",
  "packages/authz/src/permissions.ts": "Single permission registry shared by frontend and backend.",
  "packages/authz/src/rolePermissions.ts": "Default role-to-permission grants.",
  "packages/contracts/src/projectResponsibility.ts": "Project responsibility registry for labels, order, views, capabilities, and roles.",
  "packages/contracts/src/projectTable.ts": "Shared contracts for dynamic project table columns.",
  "deploy/setup-server-https.sh": "HTTPS production installer for environment, build, PM2, Nginx, and health checks.",
  "ecosystem.https.config.cjs": "PM2 production process configuration for HTTPS deployment.",
  "scripts/generate-project-index.mjs": "Deterministically generates and validates both repository indexes.",
};

function git(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024, ...options,
  });
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  return result.stdout;
}

function isIndexable(path) {
  if (path.split("/").some((segment) => excludedSegments.has(segment))) return false;
  if (["docs/x.txt", "docs/PROJECT_INDEX.md"].includes(path) || path.includes("/vendor/")) return false;
  if (["AGENTS.md", "README.md"].includes(path)) return true;
  if (path.startsWith("scripts/")) return extname(path) === ".mjs";
  if (path.startsWith("docs/")) return extname(path) === ".md";
  if (path.startsWith("deploy/")) return true;
  if (path.startsWith("packages/")) {
    return path.includes("/src/") || /\/(package|tsconfig(?:\.build)?)\.json$/.test(path);
  }
  if (path.startsWith("apps/api/src/") || path.startsWith("apps/web-fsa/src/")) {
    return sourceExtensions.has(extname(path)) && !path.endsWith("/test/random.js");
  }
  if (/^apps\/(api|web-fsa)\/(package|tsconfig)\.json$/.test(path)) return true;
  if (/^apps\/(api|web-fsa)\/\.env(?:\.production)?\.example$/.test(path)) return true;
  return rootConfigs.has(path);
}

function inventoryPaths() {
  return git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
    .split("\0").filter(Boolean).map((path) => path.replaceAll("\\", "/"))
    .filter(isIndexable).sort();
}

function changedPaths() {
  return new Set(
    git(["diff", "--name-only", "--diff-filter=ACMRTUXB", "HEAD", "--"])
      .split("\n")
      .filter(Boolean)
      .map((path) => path.replaceAll("\\", "/"))
  );
}

function contentHashes(paths) {
  const result = spawnSync("git", ["hash-object", "--stdin-paths"], {
    cwd: root, encoding: "utf8", input: `${paths.join("\n")}\n`, maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(result.stderr || "git hash-object failed");
  const hashes = result.stdout.trim().split("\n");
  return new Map(paths.map((path, index) => [path, hashes[index]?.slice(0, 12) || ""]));
}

function previousIndex() {
  if (forceFull || !existsSync(jsonPath)) return undefined;
  try {
    const value = JSON.parse(readFileSync(jsonPath, "utf8"));
    return value.schemaVersion === schemaVersion && value.generatorVersion === generatorVersion
      ? value : undefined;
  } catch { return undefined; }
}

function title(path) {
  return (path.split("/").at(-1) || path).replace(/\.[^.]+$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[._-]+/g, " ").trim();
}

function kind(path) {
  if (/\.test\.[jt]sx?$/.test(path)) return "test";
  if (/\.model\.ts$|\/models\//.test(path)) return "model";
  if (/\.controller\.ts$|\/controllers\//.test(path)) return "controller";
  if (/\.routes?\.ts$|\/routes\//.test(path)) return "route";
  if (/\.service\.ts$|\/services\//.test(path)) return "service";
  if (/validator/.test(path)) return "validator";
  if (/middleware/.test(path)) return "middleware";
  if (/Api\.ts$/.test(path) || /^apps\/web-fsa\/src\/(?:entities|features)\/[^/]+\/api\//.test(path)) return "api-client";
  if (/\/pages\//.test(path)) return "page";
  if (/\.tsx$/.test(path)) return "component";
  if (/constants|registry/i.test(path)) return "registry";
  if (/types|\.d\.ts$|packages\/contracts/.test(path)) return "type-contract";
  if (/deploy|ecosystem|nginx|\.env|package\.json|tsconfig|eslint|prettier/.test(path)) return "configuration";
  if (/docs\//.test(path) || /README\.md$|AGENTS\.md$/.test(path)) return "documentation";
  if (/scripts\//.test(path)) return "tooling";
  return "module";
}

function responsibility(path, fileKind) {
  if (descriptions[path]) return descriptions[path];
  const subject = title(path);
  return ({
    test: `Regression tests for ${subject}.`, model: `Data schema and persistence rules for ${subject}.`,
    controller: `HTTP request handlers for ${subject}.`, route: `Express routes and access guards for ${subject}.`,
    service: `Business logic for ${subject}.`, validator: `Request validation for ${subject}.`,
    middleware: `Request middleware for ${subject}.`, "api-client": `Frontend API client for ${subject}.`,
    page: `React route page for ${subject}.`, component: `React UI component for ${subject}.`,
    registry: `Shared constants or registry for ${subject}.`, "type-contract": `Shared types/contracts for ${subject}.`,
    configuration: `Build, runtime, or deployment configuration for ${subject}.`,
    documentation: `Repository documentation for ${subject}.`, tooling: `Repository automation for ${subject}.`,
    module: `Implementation module for ${subject}.`,
  })[fileKind];
}

function domain(path) {
  const value = path.toLowerCase();
  if (path === "AGENTS.md" || value.startsWith("scripts/") || value.includes("project_index")) return "repository-tooling";
  if (value.startsWith("deploy/") || /ecosystem|tsconfig|package\.json|eslint|\.env|\.gitignore|\.prettierrc|package-lock/.test(value)) return "configuration-deployment";
  if (/legacy|compatibility|diagnose/.test(value)) return "legacy-compatibility";
  if (value.startsWith("packages/")) return value.includes("authz") ? "auth-users-permissions" : "contracts-packages";
  const apiModule = value.match(/^apps\/api\/src\/modules\/([^/]+)/)?.[1];
  if (apiModule) {
    if (["projects", "settings"].includes(apiModule)) return "projects-assignments-settings";
    if (["pentest", "security-standards"].includes(apiModule)) return "pentest-security-standards";
    if (["auth", "users"].includes(apiModule)) return "auth-users-permissions";
    if (apiModule === "notifications") return "notifications-realtime";
    if (apiModule === "devops") return "devops";
    if (apiModule === "qa") return "qa-quality";
    if (["tasks", "tickets", "audit", "uploads"].includes(apiModule)) return "tasks-tickets-audit-uploads";
  }
  const frontendFeature = value.match(/^apps\/web-fsa\/src\/(?:entities|features)\/([^/]+)/)?.[1];
  if (frontendFeature) {
    if (["project", "ui-state"].includes(frontendFeature)) return "projects-assignments-settings";
    if (frontendFeature === "pentest") return "pentest-security-standards";
    if (["auth", "user", "user-access", "permission", "access-control"].includes(frontendFeature)) return "auth-users-permissions";
    if (frontendFeature === "notifications" || frontendFeature === "notification") return "notifications-realtime";
    if (frontendFeature === "devops") return "devops";
    if (frontendFeature === "task") return "tasks-tickets-audit-uploads";
  }
  if (/notification|realtime|socket/.test(value)) return "notifications-realtime";
  if (/pentest|security-standard|securitystandard|vulnerability|cvss|itemassessment|securityscope/.test(value)) return "pentest-security-standards";
  if (/project|settings|table\/columns|ui-state/.test(value)) return "projects-assignments-settings";
  if (/auth|user|permission|role/.test(value)) return "auth-users-permissions";
  if (value.includes("devops")) return "devops";
  if (/\/qa\/|quality/.test(value)) return "qa-quality";
  if (/task|ticket|audit|upload/.test(value)) return "tasks-tickets-audit-uploads";
  if (value.startsWith("apps/web-fsa/")) return "frontend-shell-ui";
  if (value.startsWith("apps/api/")) return "backend-platform";
  if (value.startsWith("docs/")) return "configuration-deployment";
  return "repository-tooling";
}

function keywords(path, fileDomain) {
  const words = path.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase().split(/\s+/).filter((word) => word.length > 2 && !["apps", "src", "fsa", "index"].includes(word));
  const standard = {
    "projects-assignments-settings": ["projects", "assignments", "table settings"],
    "pentest-security-standards": ["pentest", "security standards", "vulnerabilities"],
    "auth-users-permissions": ["authentication", "users", "permissions"],
    "notifications-realtime": ["notifications", "realtime"], devops: ["DevOps"],
    "qa-quality": ["QA", "quality"], "frontend-shell-ui": ["React", "frontend"],
    "backend-platform": ["Express", "backend"], "legacy-compatibility": ["legacy", "MongoDB"],
    "configuration-deployment": ["configuration", "deployment"], "repository-tooling": ["Codex", "repository index"],
  }[fileDomain] || [];
  return [...new Set([...words, ...standard])].slice(0, 7);
}

function symbols(content) {
  const found = new Set();
  const pattern = /export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of content.matchAll(pattern)) found.add(match[1]);
  if (/export\s+default/.test(content)) found.add("default");
  return [...found].slice(0, 8);
}

function resolveImport(fromPath, specifier, allPaths) {
  if (specifier.startsWith("@role-dashboard/authz")) return "packages/authz/src/index.ts";
  if (specifier.startsWith("@role-dashboard/contracts")) return "packages/contracts/src/index.ts";
  let base;
  if (specifier.startsWith("@/")) base = `${fromPath.startsWith("apps/api/") ? "apps/api/src" : "apps/web-fsa/src"}/${specifier.slice(2)}`;
  else if (specifier.startsWith(".")) base = posix.normalize(posix.join(posix.dirname(fromPath), specifier));
  else return undefined;
  const stem = base.replace(/\.js$/, "");
  return [base, stem, `${stem}.ts`, `${stem}.tsx`, `${stem}.js`, `${stem}/index.ts`, `${stem}/index.tsx`]
    .find((candidate) => allPaths.has(candidate));
}

function related(path, content, allPaths) {
  const found = new Set();
  for (const match of content.matchAll(/(?:import|export)\s+(?:[\s\S]*?\sfrom\s+)?["']([^"']+)["']/g)) {
    const target = resolveImport(path, match[1], allPaths);
    if (target && target !== path) found.add(target);
  }
  return [...found].sort().slice(0, 5);
}

function analyze(path, hash, allPaths) {
  const content = readFileSync(resolve(root, path), "utf8");
  const fileKind = kind(path);
  const fileDomain = domain(path);
  const exported = symbols(content);
  const relationships = related(path, content, allPaths);
  return {
    path,
    kind: fileKind,
    responsibility: responsibility(path, fileKind),
    keywords: keywords(path, fileDomain),
    ...(exported.length ? { symbols: exported } : {}),
    ...(relationships.length ? { related: relationships } : {}),
    contentHash: hash,
  };
}

function routeConstants() {
  const values = new Map();
  let section;
  for (const line of readFileSync(resolve(root, "apps/api/src/constants/routes.ts"), "utf8").split("\n")) {
    const open = line.match(/^  ([A-Z_]+): \{$/);
    if (open) { section = open[1]; continue; }
    if (/^  },/.test(line)) { section = undefined; continue; }
    const item = line.match(/^(\s+)([A-Z_]+): "([^"]*)",/);
    if (item) values.set(section && item[1].length >= 4 ? `ROUTES.${section}.${item[2]}` : `ROUTES.${item[2]}`, item[3]);
  }
  return values;
}

function callBlocks(content) {
  const blocks = [];
  for (const match of content.matchAll(/router\.(get|post|put|patch|delete)\s*\(/g)) {
    let depth = 1; let quote; let escaped = false; let cursor = match.index + match[0].length;
    for (; cursor < content.length && depth; cursor += 1) {
      const character = content[cursor];
      if (escaped) { escaped = false; continue; }
      if (character === "\\") { escaped = true; continue; }
      if (quote) { if (character === quote) quote = undefined; continue; }
      if (`"'\``.includes(character)) { quote = character; continue; }
      if (character === "(") depth += 1;
      if (character === ")") depth -= 1;
    }
    blocks.push({ method: match[1].toUpperCase(), body: content.slice(match.index + match[0].length, cursor - 1) });
  }
  return blocks;
}

function firstArgument(body) {
  let depth = 0; let quote;
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (quote) { if (character === quote && body[index - 1] !== "\\") quote = undefined; continue; }
    if (`"'\``.includes(character)) { quote = character; continue; }
    if ("([{<".includes(character)) depth += 1;
    if (")]}>".includes(character)) depth -= 1;
    if (character === "," && depth === 0) return body.slice(0, index).trim();
  }
  return body.trim();
}

function joinedPath(base, expression, constants) {
  const literal = /^["'][^"']*["']$/.test(expression) ? expression.slice(1, -1) : constants.get(expression);
  if (literal === undefined) return expression;
  if (!base) return literal;
  return literal === "/" ? base : `${base.replace(/\/$/, "")}/${literal.replace(/^\//, "")}`;
}

function apiEndpoints(paths) {
  const constants = routeConstants();
  const routeSections = { audit: "AUDIT_LOGS", auth: "AUTH", devops: "DEVOPS", notifications: "NOTIFICATIONS", pentest: "PENTEST", projects: "PROJECTS", qa: "QA", "security-standards": "SECURITY_STANDARDS", settings: "SETTINGS", tasks: "TASKS", tickets: "TICKETS", uploads: "UPLOAD", users: "USERS" };
  const result = [{ method: "GET", path: constants.get("ROUTES.HEALTH") || "/api/health", routeFile: "apps/api/src/app/app.ts", handler: "health" }];
  for (const routeFile of paths.filter((path) => /apps\/api\/src\/modules\/[^/]+\/routes\/.*\.routes\.ts$/.test(path))) {
    const moduleName = routeFile.split("/")[4];
    const base = constants.get(`ROUTES.${routeSections[moduleName]}.BASE`) || "";
    const content = readFileSync(resolve(root, routeFile), "utf8");
    for (const block of callBlocks(content)) {
      const expression = firstArgument(block.body);
      const permissions = [...new Set([...block.body.matchAll(/PERMISSIONS\.([A-Z0-9_]+)/g)].map((match) => match[1]))];
      const capabilities = [...new Set([...block.body.matchAll(/requireProjectCapability\(["']([^"']+)/g)].map((match) => match[1]))];
      result.push({ method: block.method, path: joinedPath(base, expression, constants), routeFile, ...(permissions.length ? { permissions } : {}), ...(capabilities.length ? { capabilities } : {}) });
    }
  }
  return result.sort((left, right) => left.path.localeCompare(right.path) || left.method.localeCompare(right.method));
}

function frontendRoutes() {
  const files = ["apps/web-fsa/src/entities/permission/domain/accessPolicy.ts", "apps/web-fsa/src/app/router/protectedRouteConfig.ts", "apps/web-fsa/src/app/router/AppRoutes.tsx"];
  const routes = new Map();
  for (const path of files) {
    for (const match of readFileSync(resolve(root, path), "utf8").matchAll(/["'](\/[^"'${}]*)["']/g)) {
      if (!routes.has(match[1])) routes.set(match[1], { path: match[1], source: path });
    }
  }
  return [...routes.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function majorRelationships(paths) {
  return [
    ["Project table", "apps/api/src/modules/settings/models/projectTableColumnRegistry.model.ts", ["apps/api/src/modules/projects/services/projectTableCapability.service.ts", "apps/web-fsa/src/entities/project/ui/table/columns.tsx", "apps/web-fsa/src/pages/settings/Settings.tsx"]],
    ["Project assignments", "packages/contracts/src/projectResponsibility.ts", ["apps/api/src/modules/projects/services/projectResponsibility.service.ts", "apps/api/src/middlewares/projectAccess.middleware.ts", "apps/web-fsa/src/entities/project/ui/assignment/PentesterAssignmentDock.tsx"]],
    ["Pentest workspace", "apps/api/src/modules/pentest/routes/pentest.routes.ts", ["apps/api/src/modules/pentest/services/assignedSecurityStandard.service.ts", "apps/web-fsa/src/entities/pentest/ui/PentestWorkspace.tsx"]],
    ["Notifications", "apps/api/src/modules/notifications/services/notification.service.ts", ["apps/api/src/realtime/socket.delivery.ts", "apps/web-fsa/src/features/notifications/realtime/NotificationSync.tsx"]],
    ["Permissions", "packages/authz/src/permissions.ts", ["packages/authz/src/rolePermissions.ts", "apps/api/src/middlewares/permission.middleware.ts", "apps/web-fsa/src/entities/permission/domain/accessPolicy.ts"]],
    ["Production", "deploy/setup-server-https.sh", ["ecosystem.https.config.cjs", "deploy/nginx/crm.lab.conf", "apps/api/src/config/env.ts"]],
  ].filter(([, source]) => paths.has(source)).map(([feature, source, consumers]) => ({ feature, source, consumers: consumers.filter((path) => paths.has(path)) }));
}

function buildIndex() {
  const paths = inventoryPaths();
  const pathSet = new Set(paths);
  const hashes = contentHashes(paths);
  const changed = changedPaths();
  const oldFiles = new Map((previousIndex()?.domains || []).flatMap((item) => item.files || []).map((file) => [file.path, file]));
  const entries = paths.map((path) => {
    const old = oldFiles.get(path);
    if (old?.contentHash === hashes.get(path) && !changed.has(path)) {
      const validRelated = (old.related || []).filter((item) => pathSet.has(item));
      return {
        path: old.path,
        kind: old.kind,
        responsibility: old.responsibility,
        keywords: old.keywords,
        ...(old.symbols?.length ? { symbols: old.symbols } : {}),
        ...(validRelated.length ? { related: validRelated } : {}),
        contentHash: old.contentHash,
      };
    }
    return analyze(path, hashes.get(path), pathSet);
  });
  const domains = domainDefinitions.map(([name, summary]) => ({ name, summary, keywords: keywords(name, name), files: entries.filter((entry) => domain(entry.path) === name).sort((a, b) => a.path.localeCompare(b.path)) })).filter((item) => item.files.length);
  const endpoints = apiEndpoints(paths);
  const routes = frontendRoutes();
  const relationships = majorRelationships(pathSet);
  const fingerprint = createHash("sha256").update(JSON.stringify({ domains, endpoints, routes, relationships })).digest("hex").slice(0, 16);
  return {
    schemaVersion, generatorVersion, generatedBy: "scripts/generate-project-index.mjs", sourceFingerprint: fingerprint,
    workflow: ["Read AGENTS.md, then this index or docs/PROJECT_INDEX.md.", "Search domains, keywords, symbols, endpoints, and relationships before broad search.", "Use targeted rg when the index is insufficient or potentially outdated.", "Run npm run index:project after structural changes; use index:project:check in validation."],
    roots: { backend: "apps/api/src", frontend: "apps/web-fsa/src", authorization: "packages/authz/src", contracts: "packages/contracts/src", deployment: "deploy" },
    structure: {
      backend: ["server.ts", "app/app.ts", "config", "constants", "db", "middlewares", "modules/<domain>/{controllers,models,routes,services,validators}", "realtime", "types", "utils"],
      frontend: ["app/{router,store,styles}", "pages", "entities/<domain>/{api,model,ui}", "features/<capability>", "widgets", "shared/{api,config,lib,realtime,theme,types,ui}"],
      shared: ["packages/authz/src", "packages/contracts/src"],
      operations: ["deploy", "ecosystem*.cjs", "docs", "scripts"],
    },
    exclusions: ["node_modules", "dist", "coverage", "logs", "upload/uploads", "caches", ".git", "vendored source"],
    stats: { indexedFiles: entries.length, domains: domains.length, apiEndpoints: endpoints.length, frontendRoutes: routes.length },
    majorRelationships: relationships, apiEndpoints: endpoints, frontendRoutes: routes, domains,
  };
}

function toMarkdown(index) {
  const lines = ["# Project Index", "", `Deterministic repository map generated by \`${index.generatedBy}\` (fingerprint \`${index.sourceFingerprint}\`).`, "", "> Read this map before broad repository searches. Regenerate with `npm run index:project` after structural changes.", "", "## Fast workflow", "", ...index.workflow.map((step, number) => `${number + 1}. ${step}`), "", "## Main structure", "", "| Area | Root |", "| --- | --- |", ...Object.entries(index.roots).map(([area, path]) => `| ${area} | \`${path}\` |`), "", "### Directory layout", "", ...Object.entries(index.structure).map(([area, paths]) => `- **${area}:** ${paths.map((path) => `\`${path}\``).join(", ")}`), "", "## Major feature relationships", "", ...index.majorRelationships.map((item) => `- **${item.feature}:** \`${item.source}\` → ${item.consumers.map((path) => `\`${path}\``).join(", ")}`), "", "## API endpoints", "", "| Method | Path | Route file | Guards |", "| --- | --- | --- | --- |", ...index.apiEndpoints.map((item) => `| ${item.method} | \`${item.path}\` | \`${item.routeFile}\` | ${[...(item.capabilities || []).map((value) => `cap:${value}`), ...(item.permissions || []).slice(0, 2).map((value) => `perm:${value}`)].join("; ")} |`), "", "## Frontend routes", "", ...index.frontendRoutes.map((item) => `- \`${item.path}\` — \`${item.source}\``), "", "## Domain map", ""];
  for (const item of index.domains) {
    lines.push(`### ${item.name}`, "", item.summary, "", "| File | Kind | Responsibility | Key symbols |", "| --- | --- | --- | --- |");
    for (const file of item.files) lines.push(`| \`${file.path}\` | ${file.kind} | ${file.responsibility.replaceAll("|", "\\|")} | ${(file.symbols || []).join(", ")} |`);
    lines.push("");
  }
  lines.push("## Exclusions", "", ...index.exclusions.map((item) => `- ${item}`), "");
  return `${lines.join("\n")}\n`;
}

function writeOrCheck(path, content) {
  const current = existsSync(path) ? readFileSync(path, "utf8") : undefined;
  if (checkOnly) {
    if (current !== content) { process.stderr.write(`Project index is stale: ${relative(root, path)}\n`); process.exitCode = 1; }
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  if (current !== content) writeFileSync(path, content);
}

const index = buildIndex();
writeOrCheck(jsonPath, `${JSON.stringify(index, null, 2)}\n`);
writeOrCheck(markdownPath, toMarkdown(index));
if (!process.exitCode) process.stdout.write(`${checkOnly ? "Validated" : "Generated"} ${index.stats.indexedFiles} files, ${index.stats.apiEndpoints} API endpoints, and ${index.stats.frontendRoutes} frontend routes.\n`);
