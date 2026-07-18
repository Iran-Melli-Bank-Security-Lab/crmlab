# Legacy MongoDB Compatibility Report

Date: 2026-07-18

Scope: read-only compatibility assessment and model mapping. No data migration, collection rename, deletion, merge, or document update was performed.

## Verified database and collections

The legacy database name is `test`. The backend default connection is
`mongodb://127.0.0.1:27017/test`; an explicitly configured `MONGO_URI` continues
to take precedence in deployed environments.

| Current model | Explicit collection | Documents observed | Compatibility status |
| --- | --- | ---: | --- |
| `UserModel` (`User`) | `users` | 9 | Mapped explicitly |
| `VulnerabilityModel` (`Vulnerability`) | `foundedbugs` | 25 | Mapped explicitly and normalized through verified legacy fields |
| `ProjectModel` (`Project`) | `projects` | 15 | Mapped explicitly |
| `ProjectAssignmentModel` (`ProjectAssignment`) | `projectusers` | 9 | Mapped explicitly |

No `vulnerabilities` or `projectassignments` replacement collection was detected in `test`. Model schemas explicitly disable automatic collection and index creation.

## Detected structures

### Users

Observed fields include `_id:ObjectId`, `firstName:string`, `lastName:string`, `username:string`, `password:string`, `roles:object`, legacy role flags (`devops`, `devOps`, `security`, `qualityAssurance`), `profileImageUrl`, status, refresh tokens, and project assignment arrays.

Compatibility behavior:

- `roles` accepts both current arrays and legacy `{Admin, User}` objects.
- Legacy lowercase and camel-case DevOps flags remain part of role normalization.
- `profileImageUrl` is exposed through the current `avatarUrl` API field.
- Missing names are derived from `username` only when a document is explicitly validated for a write.
- Existing `_id`, password, project references, and timestamps are preserved.

### Projects

Observed fields include `_id:ObjectId`, `projectName`, `projectType:Array`, `status`, manager references, `description:Array`, `platform` as either string or array, legacy certificate/identifier objects, dates, and `created_date`.

Compatibility behavior:

- `projectType[]` can populate current `type` during an explicit validation/write.
- Legacy manager and assignment arrays remain readable.
- Unknown legacy `type` and `status` strings are not rejected merely while reading or updating unrelated fields.

### Project-user assignments

Observed documents use legacy `project`, `pentester`, and `manager` ObjectId fields plus scopes, status, progress, and `created_at` timestamps. Current aliases are populated only during explicit current writes.

Reference diagnostic:

- 2 distinct project references; 0 invalid ObjectIds; 1 project reference is missing.
- 5 distinct user references; 0 invalid ObjectIds; 0 missing users.

Compatibility behavior:

- Reads and access checks query both current and legacy identity fields.
- New pentester assignments retain legacy `project` and `pentester` aliases.
- The current model name remains `ProjectAssignment`, but persistence is pinned to `projectusers`.

### Founded bugs

The connected `foundedbugs` collection contains 25 records. Its field layout and nested compatibility structures were inspected read-only.

| Current API field | Legacy candidates |
| --- | --- |
| `projectId` | `projectId`, `project` |
| `createdBy` | `createdBy`, `user`, `pentester`, `creator`, `reporter` |
| `title` | `title`, `bugTitle`, `label`, `name`, `vulnerabilityTitle`, `checklistItemTitle` |
| `severity` | `severity`, `risk`, `level` |
| `description` | `description`, `bugDescription`, `details`, `other_information` |
| `impact` | `impact`, `bugImpact` |
| `cve` | `cve`, `CVE` |
| `cveCvss` | `cveCvss`, `cvss`, `CVSS` |
| `httpMethod` | `httpMethod`, `method` |
| `path` | `path`, `route`, `url`, `affectedPath`, `affectedAsset` |
| `parameter` | `parameter`, `param` |
| `exploitDetails` | `exploitDetails`, `exploits`, `reproductionSteps`, `exploit`, `pocDescription` |
| `solution` | `solution`, `solutions`, `recommendation`, `remediation` |
| `toolsUsed` | `toolsUsed`, `tools` |
| `references` | `references`, `reference`, legacy misspelling `refrence`, `links` |
| `securingMethods` | `securingMethods`, `securingByOptions.webServerSettings`, `securingByOptions.modificationInProgramCode` |
| `wafSecuringPossibility` | `wafSecuringPossibility`, `securingByWAF` |
| `pocs` | Current POC metadata or legacy Multer objects containing `filename`, `originalname`, `path`, `type`, and `size` |
| `status` | `status`, `state` |

New current fields are optional or have safe response defaults at the Mongoose compatibility boundary. API create/update validators remain strict for new requests. Reading a legacy document does not backfill or save it.

## Unsupported or ambiguous values

- Legacy bug states are `New`, `Verify`, `Duplicate`, and `Not Applicable`; API responses map them to current safe status values without rewriting documents.
- Legacy project statuses are `Open` and `Closed`, while assignment statuses are `Open`, `In-Progress`, and `Finish`.
- Legacy bug severity includes the string value `null`; it is safely reported as informational.
- Existing legacy indexes were not synchronized or altered.

## Records requiring manual review

- The one `projectusers.project` reference whose target project is missing.
- Founded bugs using the legacy severity string `null`, if business owners require a severity other than informational.

## Read-only diagnostic

Run against the intended environment:

```bash
npm --workspace enterprise-dashboard-backend run diagnose:legacy-db
```

The command reports the database name, available collections, counts, sampled field/BSON types, missing collections, invalid ObjectIds, and missing references. It disables Mongoose automatic collection/index creation and performs no writes.

## Recommended future migration steps

1. Archive the read-only diagnostic JSON output.
2. Review the missing project reference and legacy `null` severity with business owners.
3. Back up and rehearse any future normalization on a database clone.
4. Require an explicit reviewed migration command; never migrate during backend startup.
