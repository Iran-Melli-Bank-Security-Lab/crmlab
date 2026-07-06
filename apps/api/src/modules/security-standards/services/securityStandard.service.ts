import { HTTP_STATUS } from "@/constants/http";
import { AppError } from "@/utils/AppError";
import {
  SecurityStandardModel,
  type SecurityStandard,
  type SecurityStandardNode,
  type SecurityStandardType,
} from "../models/securityStandard.model";

const STANDARD_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,79}$/;
const VERSION_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,39}$/;

export function validateUniqueNodeIds(nodes: readonly SecurityStandardNode[]) {
  const nodeIds = new Set<string>();

  const visit = (items: readonly SecurityStandardNode[]) => {
    for (const node of items) {
      const nodeId = node.nodeId.trim();
      if (!nodeId) {
        throw new AppError(
          "Security standard nodeId is required",
          HTTP_STATUS.BAD_REQUEST
        );
      }
      if (nodeIds.has(nodeId)) {
        throw new AppError(
          `Duplicate security standard nodeId: ${nodeId}`,
          HTTP_STATUS.BAD_REQUEST
        );
      }
      nodeIds.add(nodeId);
      visit(node.children || []);
    }
  };

  visit(nodes);
}

export function collectSecurityStandardNodeIds(nodes: readonly SecurityStandardNode[]) {
  const nodeIds: string[] = [];
  const visit = (items: readonly SecurityStandardNode[]) => {
    for (const node of items) {
      nodeIds.push(node.nodeId);
      visit(node.children || []);
    }
  };
  visit(nodes);
  return nodeIds;
}

export function validateSelectedSecurityStandardNodeIds(
  nodes: readonly SecurityStandardNode[],
  selectedNodeIds: readonly string[]
) {
  if (new Set(selectedNodeIds).size !== selectedNodeIds.length) {
    throw new AppError(
      "Duplicate selected security standard nodeId",
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const availableNodeIds = new Set(collectSecurityStandardNodeIds(nodes));
  const unknownNodeId = selectedNodeIds.find((nodeId) => !availableNodeIds.has(nodeId));
  if (unknownNodeId) {
    throw new AppError(
      `Unknown security standard nodeId: ${unknownNodeId}`,
      HTTP_STATUS.BAD_REQUEST
    );
  }
}

function validateCatalogIdentity(standardKey: string, version: string) {
  if (!STANDARD_KEY_PATTERN.test(standardKey)) {
    throw new AppError("Invalid security standard key", HTTP_STATUS.BAD_REQUEST);
  }
  if (!VERSION_PATTERN.test(version)) {
    throw new AppError("Invalid security standard version", HTTP_STATUS.BAD_REQUEST);
  }
}

export async function upsertSecurityStandardCatalog(input: SecurityStandard) {
  const standardKey = input.standardKey.trim().toLowerCase();
  const version = input.version.trim();
  validateCatalogIdentity(standardKey, version);
  validateUniqueNodeIds(input.nodes);

  return SecurityStandardModel.findOneAndUpdate(
    { standardKey, version },
    { $set: { ...input, standardKey, version } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

export async function listActiveSecurityStandards() {
  return SecurityStandardModel.find({ isActive: true })
    .select("standardKey name shortName version type isActive createdAt updatedAt")
    .sort({ type: 1, shortName: 1, version: -1 })
    .lean();
}

export async function listActiveSecurityStandardsByType(type: SecurityStandardType) {
  return SecurityStandardModel.find({ isActive: true, type })
    .select("standardKey name shortName version type isActive createdAt updatedAt")
    .sort({ shortName: 1, version: -1 })
    .lean();
}

export async function getActiveSecurityStandardTree(
  standardKeyInput: string,
  versionInput: string
) {
  const standardKey = standardKeyInput.trim().toLowerCase();
  const version = versionInput.trim();
  validateCatalogIdentity(standardKey, version);

  const standard = await SecurityStandardModel.findOne({
    standardKey,
    version,
    isActive: true,
  }).lean();

  if (!standard) {
    throw new AppError("Security standard not found", HTTP_STATUS.NOT_FOUND);
  }

  return standard;
}

export async function findActiveSecurityStandardForType({
  type,
  standardKey,
  version,
}: {
  type: SecurityStandardType;
  standardKey?: string;
  version?: string;
}) {
  const standard = await SecurityStandardModel.findOne({
    type,
    isActive: true,
    ...(standardKey ? { standardKey: standardKey.trim().toLowerCase() } : {}),
    ...(version ? { version: version.trim() } : {}),
  })
    .sort({ version: -1 })
    .lean();

  if (!standard) {
    throw new AppError(
      "No active security standard is configured for this project type",
      HTTP_STATUS.NOT_FOUND
    );
  }

  return standard;
}
