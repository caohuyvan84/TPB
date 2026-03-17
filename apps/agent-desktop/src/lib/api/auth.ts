import { apiClient } from '../api-client';

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post('/api/v1/auth/login', { username, password }),
  
  refresh: (refreshToken: string) =>
    apiClient.post('/api/v1/auth/refresh', { refreshToken }),
  
  logout: () =>
    apiClient.post('/api/v1/auth/logout'),
  
  getCurrentUser: () =>
    apiClient.get('/api/v1/users/me'),
};
