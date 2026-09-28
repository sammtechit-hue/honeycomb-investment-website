import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Verifies the JWT cookie (see JwtStrategy) and populates req.user with
// { userId, role }. Must run before RolesGuard on any protected route.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
