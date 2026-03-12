import { adminApiClient } from './api-client';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  tenantId?: string;
  agentId?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AdminUser;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  fullName: string;
  password: string;
  roles: string[];
}

export interface UpdateUserRequest {
  email?: string;
  fullName?: string;
  roles?: string[];
  isActive?: boolean;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}

export interface GetUsersResponse {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
}

export interface AuditLog {
  id: string;
  eventType: string;
  action: string;
  actorId: string;
  actorRole: string;
  resourceType: string;
  resourceId: string;
  tenantId: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}

export interface GetAuditLogsParams {
  resourceType?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface GetAuditLogsResponse {
  logs: AuditLog[];
  total: number;
}

export interface CtiConfig {
  id: string;
  tenantId: string;
  vendor: string;
  config: Record<string, unknown>;
  isActive: boolean;
}

export const adminAuthApi = {
  login: async (request: AdminLoginRequest): Promise<AdminLoginResponse> => {
    const { data } = await adminApiClient.post('/auth/login', request);
    return data;
  },

  logout: async (): Promise<void> => {
    await adminApiClient.post('/auth/logout');
  },

  getMe: async (): Promise<AdminUser> => {
    const { data } = await adminApiClient.get('/users/me');
    return data;
  },
};

export const adminUsersApi = {
  getUsers: async (params?: GetUsersParams): Promise<GetUsersResponse> => {
    const { data } = await adminApiClient.get('/users', { params });
    return data;
  },

  getUserById: async (id: string): Promise<AdminUser> => {
    const { data } = await adminApiClient.get(`/users/${id}`);
    return data;
  },

  createUser: async (request: CreateUserRequest): Promise<AdminUser> => {
    const { data } = await adminApiClient.post('/users', request);
    return data;
  },

  updateUser: async (id: string, request: UpdateUserRequest): Promise<AdminUser> => {
    const { data } = await adminApiClient.patch(`/users/${id}`, request);
    return data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await adminApiClient.delete(`/users/${id}`);
  },
};

export const adminRolesApi = {
  getRoles: async (): Promise<AdminRole[]> => {
    const { data } = await adminApiClient.get('/roles');
    return data;
  },

  getRoleById: async (id: string): Promise<AdminRole> => {
    const { data } = await adminApiClient.get(`/roles/${id}`);
    return data;
  },

  createRole: async (request: CreateRoleRequest): Promise<AdminRole> => {
    const { data } = await adminApiClient.post('/roles', request);
    return data;
  },

  updateRole: async (id: string, request: UpdateRoleRequest): Promise<AdminRole> => {
    const { data } = await adminApiClient.patch(`/roles/${id}`, request);
    return data;
  },

  deleteRole: async (id: string): Promise<void> => {
    await adminApiClient.delete(`/roles/${id}`);
  },
};

export const adminAuditApi = {
  getLogs: async (params?: GetAuditLogsParams): Promise<GetAuditLogsResponse> => {
    const { data } = await adminApiClient.get('/audit/logs', { params });
    return data;
  },

  verifyChain: async (tenantId: string): Promise<{ valid: boolean; message: string }> => {
    const { data } = await adminApiClient.get('/audit/verify-chain', { params: { tenantId } });
    return data;
  },
};

export const adminCtiApi = {
  getConfig: async (tenantId: string): Promise<CtiConfig> => {
    const { data } = await adminApiClient.get('/cti/config', { params: { tenantId } });
    return data;
  },

  updateConfig: async (tenantId: string, updates: Partial<CtiConfig>): Promise<CtiConfig> => {
    const { data } = await adminApiClient.patch('/cti/config', { ...updates, tenantId });
    return data;
  },
};
