import { z } from "zod";
import { isIP } from "node:net";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const clientId = z.string().trim().min(1).max(100);
const port = z.coerce.number().int().min(1).max(65535);
const ip = z.string().trim().refine((value) => isIP(value) !== 0, "Invalid IP address");
const optionalText = z.string().trim().max(2000).optional();
const secretInput = z.union([
  z.object({ value: z.string().min(1).max(10000) }).strict(),
  z.object({ unchanged: z.literal(true) }).strict(),
]);

const account = z
  .object({
    id: clientId,
    authenticationMethod: z.enum(["username_password", "username_password_otp"]),
    username: z.string().trim().min(1).max(255),
    password: secretInput,
    otp: z
      .object({
        type: z.string().trim().min(1).max(100),
        secret: secretInput,
        deliveryMethod: z.string().trim().max(255).optional(),
        instructions: optionalText,
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.authenticationMethod === "username_password_otp" && !value.otp) {
      context.addIssue({ code: "custom", path: ["otp"], message: "OTP information is required" });
    }
    if (value.authenticationMethod === "username_password" && value.otp) {
      context.addIssue({ code: "custom", path: ["otp"], message: "OTP information is not allowed" });
    }
  });

const endpoint = z
  .object({
    id: clientId,
    url: z.string().trim().url().optional(),
    ipAddress: ip.optional(),
    port: port.optional(),
    description: optionalText,
    authenticationAccounts: z.array(account).max(100),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.url && !value.ipAddress) {
      context.addIssue({ code: "custom", path: ["url"], message: "Provide a URL or IP address" });
    }
    if (value.ipAddress && !value.port) {
      context.addIssue({ code: "custom", path: ["port"], message: "Port is required with an IP address" });
    }
  });

const uniqueIds = <T extends { id: string }>(items: T[], context: z.RefinementCtx) => {
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    context.addIssue({ code: "custom", message: "Duplicate client identifiers are not allowed" });
  }
  for (const item of items as Array<T & { authenticationAccounts?: T[] }>) {
    if (item.authenticationAccounts) uniqueIds(item.authenticationAccounts, context);
  }
};

const endpoints = z.array(endpoint).max(500).superRefine(uniqueIds);
const sharedVm = z.object({ endpoints }).strict();
const separateVm = z
  .object({
    serverIpAddress: ip,
    serverPort: port,
    vmUsername: z.string().trim().min(1).max(255),
    vmPassword: secretInput,
    users: z
      .array(
        z
          .object({
            assignmentId: objectId,
            userId: objectId,
            serverUsername: z.string().trim().min(1).max(255),
            serverPassword: secretInput,
            vmIpAddress: ip,
            vmPort: port,
            endpoints: z.array(endpoint).max(500).superRefine((items, ctx) => {
              uniqueIds(items, ctx);
              items.forEach((item, index) => {
                if (!item.ipAddress) ctx.addIssue({ code: "custom", path: [index, "ipAddress"], message: "IP address is required" });
                if (!item.port) ctx.addIssue({ code: "custom", path: [index, "port"], message: "Port is required" });
              });
            }),
          })
          .strict()
      )
      .max(500)
      .superRefine((users, ctx) => {
        if (new Set(users.map((user) => user.assignmentId)).size !== users.length) ctx.addIssue({ code: "custom", message: "Duplicate assignments are not allowed" });
      }),
  })
  .strict();

export const devopsInfoRequestSchema = z
  .object({
    deploymentMode: z.enum(["shared_vm", "separate_vm_per_user"]),
    sharedVm: sharedVm.optional(),
    separateVm: separateVm.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.deploymentMode === "shared_vm" && !value.sharedVm) ctx.addIssue({ code: "custom", path: ["sharedVm"], message: "Shared VM information is required" });
    if (value.deploymentMode === "separate_vm_per_user" && !value.separateVm) ctx.addIssue({ code: "custom", path: ["separateVm"], message: "Per-user VM information is required" });
  });

export const putDevopsInfoSchema = z.object({ body: devopsInfoRequestSchema, params: z.object({ projectId: objectId }) });
export const getDevopsInfoSchema = z.object({ params: z.object({ projectId: objectId }) });
export type DevopsInfoInput = z.infer<typeof devopsInfoRequestSchema>;
