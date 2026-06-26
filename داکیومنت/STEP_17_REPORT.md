# Step 17 — Enterprise Stabilization Report

این نسخه بر اساس همان پروژه ZIP قبلی ساخته شده است و هدفش اضافه کردن فیچر بزرگ جدید نبود؛ هدف اصلی، پایدار کردن معماری و رفع mismatchهای مهم بین فرانت، بک‌اند و realtime بود.

## تصمیم‌های مهمی که طبق درخواست حفظ شد

### 1. مسیر `/auth/register-admin` حذف نشد

این endpoint برای حالت development / bootstrap نگه داشته شد. در فرانت هم signup هنوز از همین مسیر استفاده می‌کند.

نکته مهم برای production:

- این مسیر در نسخه فعلی حذف نشده است.
- اگر پروژه وارد محیط واقعی شد، بهتر است با ENV یا middleware فقط در حالت development فعال باشد.
- فعلاً چون درخواست شد برای development بماند، دست نزده شد.

### 2. Socket اصلی همان `@/realtime/socket.server` است

در نسخه قبلی دو پیاده‌سازی Socket.IO وجود داشت:

```txt
apps/api/src/realtime/socket.server.ts
apps/api/src/realtime/socket/server.ts
```

طبق درخواست، نسخه canonical همین فایل است:

```txt
@/realtime/socket.server
```

در Step 17 فایل زیر فقط wrapper سازگارکننده است تا importهای قدیمی باعث ساخت instance دوم نشوند:

```txt
apps/api/src/realtime/socket/server.ts
```

## تغییرات مهم Backend

### 1. یکپارچه‌سازی Socket.IO

مشکل قبلی این بود که server با `@/realtime/socket.server` initialize می‌شد، اما delivery از `./socket/server` استفاده می‌کرد. نتیجه این بود که notificationها و project eventها ممکن بود به Socket instance اشتباه emit شوند.

در Step 17:

- `socket.delivery.ts` به `./socket.server` وصل شد.
- `socket.server.ts` دارای `setupSocket`, `getIO`, `getIOIfInitialized`, `closeSocket` شد.
- Redis adapter و socket config در همان socket اصلی ادغام شد.
- shutdown پروژه حالا `closeSocket()` را صدا می‌زند.

فایل‌های اصلی:

```txt
apps/api/src/realtime/socket.server.ts
apps/api/src/realtime/socket.delivery.ts
apps/api/src/server.ts
```

### 2. اصلاح build بک‌اند برای aliasهای `@/`

چون TypeScript به‌صورت پیش‌فرض path alias را در خروجی JS rewrite نمی‌کند، build بک‌اند ممکن بود بعد از `node dist/server.js` مشکل import داشته باشد.

در Step 17:

```json
"build": "tsc && tsc-alias -p tsconfig.json"
```

به backend اضافه شد و `tsc-alias` به devDependencies اضافه شد.

### 3. سخت‌گیری production secrets

در `apps/api/src/config/env.ts` اضافه شد که در production نباید secretهای dev استفاده شوند:

```txt
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
CSRF_SECRET
```

اگر در production تنظیم نشده باشند، backend خطا می‌دهد و اجرا نمی‌شود.

### 4. اصلاح User API

فرانت endpointهای زیر را استفاده می‌کرد، اما بک‌اند کامل نبود:

```txt
GET /api/users/:userId
DELETE /api/users/:userId
PUT /api/users/:userId
```

در Step 17:

- `getUserById` اضافه شد.
- `deleteUser` اضافه شد، ولی به‌صورت soft delete عمل می‌کند.
- یعنی user حذف فیزیکی نمی‌شود، بلکه `status = Inactive` و `isActive = false` می‌شود.
- موقع تغییر role/permission، `status` هم ذخیره می‌شود.
- `sessionVersion` افزایش پیدا می‌کند تا sessionهای قدیمی invalid شوند.

فایل‌های اصلی:

```txt
apps/api/src/modules/users/controllers/user.controller.ts
apps/api/src/modules/users/routes/user.routes.ts
apps/api/src/modules/users/validators/user.validators.ts
apps/api/src/modules/users/services/userAuth.service.ts
```

### 5. اصلاح Notification API

فرانت mutation حذف notification داشت، اما بک‌اند route متناظر نداشت.

در Step 17 اضافه شد:

```txt
DELETE /api/notifications/:id
```

همچنین بعد از delete، event زیر emit می‌شود:

```txt
notification:deleted
```

فایل‌های اصلی:

```txt
apps/api/src/modules/notifications/controllers/notification.controller.ts
apps/api/src/modules/notifications/routes/notification.routes.ts
apps/api/src/constants/socket.ts
apps/api/src/realtime/socket.types.ts
```

### 6. اصلاح Upload API

قبلاً backend برای upload این را برمی‌گرداند:

```json
{
  "avatarUrl": "/uploads/file.png",
  "user": null
}
```

ولی فرانت انتظار داشت:

```json
{
  "url": "/uploads/file.png",
  "fileId": "file.png"
}
```

در Step 17 backend هر دو را می‌دهد تا compatibility حفظ شود:

```json
{
  "url": "/uploads/file.png",
  "fileId": "file.png",
  "avatarUrl": "/uploads/file.png",
  "user": null
}
```

همچنین route حذف فایل اضافه شد:

```txt
DELETE /api/upload/:id
```

حذف upload فقط با auth انجام می‌شود.

### 7. اصلاح Project admin access

قبلاً view admin فقط projectهای owner را می‌دید:

```ts
return { ownerId: userId };
```

در Step 17 اگر کاربر `admin.system.manage.all` داشته باشد، همه پروژه‌ها را می‌بیند:

```ts
return {};
```

### 8. assignment پروژه حرفه‌ای‌تر شد

قبلاً assignment تقریباً فقط `pentester` را پشتیبانی می‌کرد.

در Step 17 assignment roleها از registry پروژه خوانده می‌شوند:

```txt
pentester
qa
devops
manager
```

همچنین هنگام assign کردن userها، علاوه بر `assignedUserIds`، کالکشن `ProjectAssignment` هم update می‌شود. یعنی پروژه یک قدم به سمت معماری enterprise و source-of-truth جداگانه برای assignment نزدیک‌تر شد.

## تغییرات مهم Frontend

### 1. اضافه شدن helper مرکزی برای responseهای API

برای اینکه mismatch بین response بک‌اند و RTK Query کمتر شود، فایل زیر اضافه شد:

```txt
apps/web-fsa/src/shared/api/unwrapApiData.ts
```

این helper responseهای envelope شده را unwrap می‌کند:

```ts
{ success: true, data: ... }
```

### 2. اصلاح usersApi

`usersApi` حالا responseهای بک‌اند را درست normalize می‌کند:

- list users
- get user by id
- create user
- update user
- delete user
- roles and permissions

فایل:

```txt
apps/web-fsa/src/entities/user/api/usersApi.ts
```

### 3. اصلاح notificationsApi

`notificationsApi` حالا response بک‌اند را درست unwrap می‌کند و delete mutation با backend هماهنگ شد.

فایل:

```txt
apps/web-fsa/src/features/notifications/api/notificationsApi.ts
```

### 4. اصلاح uploadApi

`uploadApi` حالا هم `url/fileId` و هم response قدیمی `avatarUrl` را پشتیبانی می‌کند.

فایل:

```txt
apps/web-fsa/src/shared/api/uploadApi.ts
```

## تست‌هایی که انجام شد

### Typecheck

```bash
npm run typecheck
```

نتیجه:

```txt
API typecheck: passed
WEB typecheck: passed
```

### Build

```bash
npm run build
```

نتیجه:

```txt
API build: passed
WEB build: passed
```

تنها هشدار build مربوط به Vite chunk size بود:

```txt
Some chunks are larger than 500 kB after minification
```

این خطا نیست. برای مرحله‌های بعد می‌شود با code splitting بهترش کرد.

## مسیر پیشنهادی مرحله ۱۸

برای Step 18 پیشنهاد می‌شود وارد فیچرهای واقعی آزمایشگاه شویم، اما نه با controllerهای سنگین. بهتر است اول use caseها ساخته شوند:

```txt
modules/projects/application/assign-users-to-project.usecase.ts
modules/projects/application/create-project.usecase.ts
modules/pentest/application/submit-finding.usecase.ts
modules/qa/application/submit-test-result.usecase.ts
```

اولویت پیشنهادی:

1. جدا کردن use caseهای Project از controller
2. تبدیل ProjectAssignment به source of truth کامل
3. ساخت workflow یافته‌های امنیتی: submit → review → approve/reject
4. ساخت workflow QA: submit test result → review → approve/reject
5. ساخت report module
6. اضافه کردن تست‌های automated برای auth, users, projects, assignment

## نکته نصب

بعد از unzip کردن نسخه ۱۷:

```bash
npm install
npm run typecheck
npm run build
```

برای اجرا:

```bash
npm run dev
```

برای seed:

```bash
npm run seed:api
```
