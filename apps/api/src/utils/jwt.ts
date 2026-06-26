import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import { env } from "@/config/env";

export type AccessTokenPayload = {
  id: string;
  sessionVersion: number;
};

export type RefreshTokenPayload = AccessTokenPayload & {
  tokenId: string;
};

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.accessTokenTtl as StringValue });
}

export function signRefreshToken(payload: RefreshTokenPayload) {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.refreshTokenTtl as StringValue });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
}
