/**
 * JWT Utility Functions
 *
 * Helpers for signing and verifying JWT tokens
 */

import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthError, AuthErrorCode } from '../types/user.types';
import type { JwtPayload, RefreshTokenPayload } from '../types/user.types';

// =============================================================================
// JWT Signing
// =============================================================================

/**
 * Sign a JWT token
 */
export async function jwtSign(
  payload: Record<string, unknown>,
  expiresIn: string = '1h'
): Promise<string> {
  return new Promise((resolve, reject) => {
    jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn } as jwt.SignOptions,
      (err, token) => {
        if (err) reject(err);
        else resolve(token!);
      }
    );
  });
}

/**
 * Verify a JWT token
 */
export async function jwtVerify(token: string): Promise<JwtPayload | RefreshTokenPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, config.jwtSecret, (err, payload) => {
      if (err) {
        if (err instanceof jwt.TokenExpiredError) {
          reject(new AuthError(AuthErrorCode.TOKEN_EXPIRED, 'Token has expired', 401));
        } else {
          reject(new AuthError(AuthErrorCode.INVALID_TOKEN, 'Invalid token', 401));
        }
      } else {
        resolve(payload as JwtPayload | RefreshTokenPayload);
      }
    });
  });
}

/**
 * Decode JWT token without verification (for debugging)
 */
export function jwtDecode(token: string): JwtPayload | RefreshTokenPayload | null {
  try {
    return jwt.decode(token) as JwtPayload | RefreshTokenPayload;
  } catch {
    return null;
  }
}
