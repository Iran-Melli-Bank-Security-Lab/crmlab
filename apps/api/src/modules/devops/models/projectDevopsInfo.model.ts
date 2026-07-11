import mongoose, { Schema, type InferSchemaType } from "mongoose";

const secretSchema = new Schema(
  { ciphertext: { type: String, required: true }, iv: { type: String, required: true }, tag: { type: String, required: true } },
  { _id: false }
);

const authAccountSchema = new Schema(
  {
    clientId: { type: String, required: true },
    authenticationMethod: { type: String, enum: ["username_password", "username_password_otp"], required: true },
    username: { type: String, required: true, trim: true },
    password: { type: secretSchema, required: true },
    otp: {
      type: new Schema(
        {
          type: { type: String, trim: true },
          secret: secretSchema,
          deliveryMethod: { type: String, trim: true },
          instructions: { type: String, trim: true },
        },
        { _id: false }
      ),
      default: undefined,
    },
  },
  { _id: true }
);

const endpointSchema = new Schema(
  {
    clientId: { type: String, required: true },
    url: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
    port: { type: Number, min: 1, max: 65535 },
    description: { type: String, trim: true },
    authenticationAccounts: { type: [authAccountSchema], default: [] },
  },
  { _id: true }
);

const userDeploymentSchema = new Schema(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: "ProjectAssignment", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    serverUsername: { type: String, required: true, trim: true },
    serverPassword: { type: secretSchema, required: true },
    vmIpAddress: { type: String, required: true, trim: true },
    vmPort: { type: Number, required: true, min: 1, max: 65535 },
    endpoints: { type: [endpointSchema], default: [] },
  },
  { _id: false }
);

const projectDevopsInfoSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, unique: true },
    deploymentMode: { type: String, enum: ["shared_vm", "separate_vm_per_user"], required: true },
    sharedVm: { type: new Schema({ endpoints: { type: [endpointSchema], default: [] } }, { _id: false }), default: undefined },
    separateVm: {
      type: new Schema(
        {
          serverIpAddress: { type: String, required: true, trim: true },
          serverPort: { type: Number, required: true, min: 1, max: 65535 },
          vmUsername: { type: String, required: true, trim: true },
          vmPassword: { type: secretSchema, required: true },
          users: { type: [userDeploymentSchema], default: [] },
        },
        { _id: false }
      ),
      default: undefined,
    },
    updatedById: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, optimisticConcurrency: true }
);

projectDevopsInfoSchema.index({ "separateVm.users.assignmentId": 1 });
export type ProjectDevopsInfoDocument = InferSchemaType<typeof projectDevopsInfoSchema> & { _id: mongoose.Types.ObjectId };
export const ProjectDevopsInfoModel = mongoose.model<ProjectDevopsInfoDocument>("ProjectDevopsInfo", projectDevopsInfoSchema);
