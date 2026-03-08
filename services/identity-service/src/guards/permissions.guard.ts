import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.permissions) {
      return false;
    }

    // Check if user has wildcard permission
    if (user.permissions.includes('*:*:all')) {
      return true;
    }

    // Check each required permission
    return requiredPermissions.every(permission => {
      return this.hasPermission(user.permissions, permission, user);
    });
  }

  private hasPermission(userPermissions: string[], required: string, user: any): boolean {
    // Parse required permission: resource:action:scope
    const [resource, action, scope] = required.split(':');

    for (const perm of userPermissions) {
      const [permResource, permAction, permScope] = perm.split(':');

      // Check resource match
      if (permResource !== '*' && permResource !== resource) {
        continue;
      }

      // Check action match
      if (permAction !== '*' && permAction !== action) {
        continue;
      }

      // Check scope match
      if (this.matchesScope(permScope, scope, user)) {
        return true;
      }
    }

    return false;
  }

  private matchesScope(permScope: string, requiredScope: string, user: any): boolean {
    if (permScope === 'all') return true;
    if (permScope === requiredScope) return true;
    
    // Scope hierarchy: all > department > team > own
    const scopeHierarchy = ['own', 'team', 'department', 'all'];
    const permLevel = scopeHierarchy.indexOf(permScope);
    const requiredLevel = scopeHierarchy.indexOf(requiredScope);
    
    return permLevel >= requiredLevel;
  }
}
