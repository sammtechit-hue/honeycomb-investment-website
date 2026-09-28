import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@investment-platform/db';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../types/jwt-payload.interface';

// Must run after JwtAuthGuard. Denies by default: a route with no
// @Roles(...) declared on it (handler or controller) is unreachable through
// this guard, so every protected route has to state explicitly who is
// allowed on it.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      return false;
    }

    // SUPER_ADMIN always passes — top of the role hierarchy, no route should
    // need to list it explicitly in @Roles(...).
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Role ${user.role} is not permitted to perform this action.`,
      );
    }

    return true;
  }
}
