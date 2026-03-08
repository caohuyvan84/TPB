import axios, { AxiosInstance } from 'axios';
import { authInterceptor } from './interceptors/auth.interceptor';
import { createErrorInterceptor } from './interceptors/error.interceptor';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(authInterceptor);
apiClient.interceptors.response.use(
  (response) => response,
  createErrorInterceptor(apiClient)
);

export default apiClient;
