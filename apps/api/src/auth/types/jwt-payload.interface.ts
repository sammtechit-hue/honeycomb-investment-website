import { Role } from '@investment-platform/db';

// Claims signed into the access token (httpOnly cookie, never
// localStorage). iss/aud/iat/exp are added and checked by JwtService.
export interface JwtPayload {
  sub: string; // User.id
  role: Role;
  tv: number; // User.tokenVersion at issuance — see schema comment
  jti: string; // unique per token — lets logout revoke just this one
  exp?: number;
}

// What JwtStrategy.validate() attaches to the request as req.user.
export interface AuthenticatedUser {
  userId: string;
  role: Role;
  jti: string;
  exp: number; // unix seconds — needed to size the blacklist row on logout
}
