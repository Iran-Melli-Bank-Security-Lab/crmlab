# CRMLab UX/UI Audit

## Scope

This audit reviews the current React and Chakra UI v3 implementation without changing business logic, API contracts, permissions, routes, or workflows. It covers the application shell, navigation, headers, theme, typography, spacing, color, surfaces, forms, tables, overlays, feedback states, RTL/Persian localization, dark mode, responsive behavior, accessibility, and rendering performance.

No source files were modified as part of the audit. `npm run typecheck:web` and `npm run build:web` both passed.

## 1. Main UX/UI problems

- The design system is split across Chakra semantic tokens, approximately 30 `--apple-*` CSS variables, legacy CSS classes, shared primitives, and direct Chakra component styling. Colors, spacing, radii, borders, and interactions therefore lack a single source of truth.
- Pages do not share a standard header. Projects, Tasks, Dashboard, Settings, Profile, Admin Users, Project Details, and the pentest workspace use different title sizes, badges, descriptions, spacing, and action placement.
- Surfaces are over-decorated. The implementation contains roughly 114 explicit one-pixel borders, 38 component shadows, 11 backdrop filters, and 145 literal color declarations. Nested cards and bordered rows make Settings, Project Details, user management, and pentest screens visually dense.
- The shared `Card` adds a shadow, blur, border, hover shadow, and elevation behavior even to non-interactive informational panels. This weakens hierarchy and adds unnecessary paint work.
- Primary and secondary action hierarchy is inconsistent. Some screens use the shared `Button`; others use raw Chakra buttons with `outline`, `ghost`, or `colorPalette` variants.
- Forms mix shared `Input` and `Select`, raw Chakra inputs, native selects, textareas, and local field wrappers. Error text, label weight, field height, help text, and focus behavior vary.
- Loading, empty, and error components exist, but pages frequently wrap them in additional bordered cards or use hardcoded English alternatives. Permission denial is a centered message without a recovery action.
- Several labels, dates, statuses, fallbacks, DevOps forms, project details, notification permission messages, and workspace values remain English in Persian mode.
- Responsive tables generally scroll correctly, but the mobile navbar can become crowded by the user identity, role badges, language, theme, notifications, and profile controls. Public navigation also lacks an explicit wrapping strategy.

## 2. Most important inconsistencies

### Broken Settings theme control

`apps/web-fsa/src/pages/settings/Settings.tsx` changes Redux `ui.theme`, stored under `theme`. The rendered color mode is controlled separately by `apps/web-fsa/src/shared/theme/colorMode.tsx`, stored under `role-dashboard-color-mode`. Settings can display and toggle a value without changing the actual application theme.

### Duplicate token sources

`apps/web-fsa/src/shared/theme/index.ts` defines semantic theme tokens, while `apps/web-fsa/src/app/styles/styles.css` independently defines the colors used by most components. Hardcoded component colors form a third layer.

### Legacy and current UI coexist

`styles.css` retains old `.card`, `.btn`, `.sidebar`, `.navbar`, form, state, and permission-manager rules while current components mostly use Chakra style props. This increases ambiguity and makes safe visual changes harder.

### Inconsistent page hierarchy

- Projects and Tasks use badge/title/description/count headers.
- Dashboard uses another header scale and composition.
- Settings and Profile use plain default headings.
- Project Details and pentest pages define their own header and metric patterns.
- Title weights range from 700 through nonstandard 950, and title sizes range from Chakra defaults through `2xl`, `3xl`, and `2.5rem`.

### RTL uses physical properties

- The desktop sidebar uses `borderRight` rather than `borderInlineEnd`.
- User management uses `borderRight`, `pr`, and `textAlign="left"` in content that can render in RTL.
- Some content correctly forces LTR for technical values, but this policy is not consistently applied to URLs, identifiers, version numbers, dates, and code-like content.

### Accessibility behavior varies

- Sidebar links explicitly remove every visible focus indication.
- Sortable project table headers are clickable table cells rather than keyboard-operable buttons.
- `FindingDetailsModal` is a custom modal without a focus trap, focus restoration, Escape handling, or accessible title association.
- The full-screen finding report uses dialog roles but does not provide the complete behavior of a managed dialog primitive.
- Settings keyboard reordering accepts arrow keys but does not announce the new position or operation result.
- Global transitions do not respect `prefers-reduced-motion`.

### Forms and feedback states vary

- Shared form primitives are only partially adopted.
- Some fields provide structured validation while others depend on toast-only feedback or local messages.
- Loading states range from full elevated panels to inline spinners.
- Error states are sometimes nested inside another bordered surface.
- Empty and permission states do not consistently offer a useful next action.

## 3. Components that should become shared

### `PageHeader`

Support an optional eyebrow or badge, title, description, metadata, primary action, secondary actions, and predictable responsive wrapping.

### `Surface` or `SectionPanel`

Provide flat, outlined, elevated, and interactive variants. Use it to replace repeated local implementations such as `DetailPanel`, form sections, metric tiles, and card-like boxes.

### Unified form field family

Extend shared form components to cover:

- Input
- Select
- Textarea
- Secret input
- Help text
- Validation text
- Required and optional indicators
- RTL-aware label and field alignment

### `StatusBadge` or `ToneBadge`

Centralize status, priority, severity, notification, connection, success, warning, and danger colors.

### `DataTableShell`

Standardize the toolbar, scroll area, sortable headers, table density, empty/error/loading content, and pagination. Tasks and Projects currently implement related table behavior differently.

### Managed `Dialog`

Build on Chakra Dialog so overlays consistently provide focus trapping, focus restoration, Escape handling, scroll locking, title/description relationships, and footer action order.

### `StatePanel`

Unify loading, empty, error, not-found, and permission-denied variants with optional retry or recovery actions.

### `DetailList` and `Metric`

Reduce the many individually bordered boxes used for project metadata and workspace metrics.

### `ActionGroup`

Standardize placement, ordering, wrapping, and visual importance of primary, secondary, destructive, and cancel actions.

### Shared icons and icon buttons

Consolidate repeated inline SVG implementations and ensure icon-only controls share size, focus, tooltip, and accessible-name behavior.

Existing components under `apps/web-fsa/src/shared/ui` should be extended rather than introducing another parallel abstraction layer.

## 4. Performance problems found

### Settings page

The Settings page is the clearest render hot spot.

- `onDragOver` calls `setDropTargetKey` continuously, re-rendering the entire Settings component tree during pointer movement.
- Every render rebuilds all allowed contexts, filters and sorts columns, merges order arrays with repeated `includes`, and sorts with repeated `indexOf` calls.
- All tab content is generated through `allowedContexts.map` instead of explicitly rendering only the active context editor.
- `ColumnAliasEditor` is memoized but receives newly created `onSave` and `onClear` functions from its parent on every render, substantially reducing the value of memoization.
- Checkbox changes and every reorder immediately issue a PUT request. There is no debounce, batching, save queue, failure state, or visible persistence status.
- Settings subscribes to the complete UI settings collection instead of selecting only the active context.
- The theme control duplicates state and causes updates that do not affect the rendered theme.

### Other rendering and interaction concerns

- Tasks selects the complete `state.ui` object, so unrelated UI state changes can re-render the page.
- Multiple translucent sticky surfaces, large shadows, backdrop blur, and hover-shadow transitions increase compositing and paint work. They are plausible contributors to general mouse lag, particularly on lower-powered clients.
- The shared Card changes shadow on hover for non-interactive content, causing unnecessary repainting as the pointer moves across a dashboard.
- Several components use `transition="all"`, allowing the browser to animate more properties than necessary.
- React Strict Mode can amplify development-only render and effect behavior; production profiling is needed before attributing all perceived lag to React itself.

No other global mouse or pointer-move handler was found. The Settings drag handler and expensive visual effects are the strongest static candidates for reported interaction lag.

### Positive performance findings

- Pages and heavier workspace modules are code-split.
- Project table filtering, sorting, pagination, and several workspace computations use memoization.
- The production build succeeds.
- The Settings route is approximately 7.7 KB before gzip, so route bundle size is not the primary cause of its interaction lag.
- There is no obvious single oversized page bundle responsible for the reported mouse lag.

A React Profiler and browser Performance trace should be captured during implementation to quantify commit duration, paint time, layer count, and drag-event frequency.

## 5. Prioritized implementation plan

### P0 — Correctness and accessibility

1. Remove the duplicate Redux theme state and connect Settings to `ColorModeProvider`.
2. Restore a visible sidebar focus treatment.
3. Replace custom finding modals with Chakra Dialog or provide equivalent managed-dialog behavior.
4. Replace physical RTL properties with logical properties.
5. Localize high-visibility English strings and locale-sensitive dates and numbers.
6. Add explicit loading, failure, and saved states to Settings persistence.

### P1 — Settings and interaction performance

1. Track the active Settings tab and render only its editor.
2. Extract memoized context-editor and column-row components.
3. Memoize registry normalization and use maps and sets instead of repeated `indexOf` and `includes` work.
4. Update the drag target only when it changes and keep rapidly changing drag data in refs where appropriate.
5. Stabilize callbacks passed to memoized rows.
6. Debounce or serialize API saves while keeping optimistic UI and failure recovery.
7. Narrow Redux selectors to the active context.
8. Profile the page in both development and production builds.

### P2 — Visual consistency without redesign

1. Establish one token source in the Chakra theme and map or remove legacy variables.
2. Introduce `PageHeader`, `Surface`, `StatusBadge`, `ActionGroup`, and unified form fields.
3. Remove hover elevation from non-interactive panels.
4. Reduce nested borders and shadows, especially in Settings, Project Details, Admin Users, and pentest modules.
5. Standardize title scale, content width, section spacing, table density, and action order.
6. Remove obsolete global CSS after confirming no active consumers remain.

### P3 — Responsive and localization hardening

1. Simplify the mobile navbar and move low-frequency controls into the profile menu.
2. Test the shell, tables, drawers, and long Persian labels at 320, 375, 768, and 1024 pixels.
3. Move remaining component-local copy into the translation catalog.
4. Use locale-aware dates and numbers and logical CSS properties throughout.
5. Add reduced-motion styles and automated accessibility checks.

## 6. Files likely to need modification

### Primary files

- `apps/web-fsa/src/pages/settings/Settings.tsx`
- `apps/web-fsa/src/features/ui-state/model/uiSlice.ts`
- `apps/web-fsa/src/features/ui-state/api/projectTableSettingsApi.ts`
- `apps/web-fsa/src/shared/theme/colorMode.tsx`
- `apps/web-fsa/src/shared/theme/index.ts`
- `apps/web-fsa/src/app/styles/styles.css`
- `apps/web-fsa/src/widgets/dashboard-layout/DashboardLayout.tsx`
- `apps/web-fsa/src/widgets/navbar/ui/Navbar.tsx`
- `apps/web-fsa/src/widgets/sidebar/ui/Sidebar.tsx`
- `apps/web-fsa/src/shared/ui/primitives/Button.tsx`
- `apps/web-fsa/src/shared/ui/primitives/Card.tsx`
- `apps/web-fsa/src/shared/ui/primitives/Input.tsx`
- `apps/web-fsa/src/shared/ui/primitives/Select.tsx`
- Files under `apps/web-fsa/src/shared/ui/feedback`

### Secondary migration targets

- `apps/web-fsa/src/entities/project/ui/table/ProjectTableBase.tsx`
- `apps/web-fsa/src/pages/create-project/CreateProject.tsx`
- `apps/web-fsa/src/pages/project-details/ProjectDetails.tsx`
- `apps/web-fsa/src/pages/projects/Projects.tsx`
- `apps/web-fsa/src/pages/tasks/Tasks.tsx`
- `apps/web-fsa/src/pages/admin-users/AdminUsers.tsx`
- `apps/web-fsa/src/features/user-access/ui/RolePermissionManager.tsx`
- `apps/web-fsa/src/entities/pentest/ui/modules/FindingDetailsModal.tsx`
- `apps/web-fsa/src/entities/pentest/ui/modules/FindingReportModal.tsx`
- Other components under `apps/web-fsa/src/entities/pentest/ui/modules`
- `apps/web-fsa/src/features/language/model/index.tsx`
- `apps/web-fsa/src/widgets/notification-center/ui/NotificationCenter.tsx`
- `apps/web-fsa/src/widgets/profile-menu/ui/ProfileMenu.tsx`
- `apps/web-fsa/src/features/language/ui/LanguageSwitcher.tsx`
- `apps/web-fsa/src/features/theme/ui/ThemeToggle.tsx`

## Validation

- `npm run typecheck:web`: passed
- `npm run build:web`: passed
- No business logic, API contract, permission, route, or workflow changes were made.
