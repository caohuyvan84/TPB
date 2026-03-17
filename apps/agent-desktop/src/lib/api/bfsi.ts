import { apiClient } from '../api-client';

export const bfsiApi = {
  getAccounts: (cif: string) =>
    apiClient.get(`/api/v1/bfsi/customers/${cif}/accounts`),
  
  getSavings: (cif: string) =>
    apiClient.get(`/api/v1/bfsi/customers/${cif}/savings`),
  
  getLoans: (cif: string) =>
    apiClient.get(`/api/v1/bfsi/customers/${cif}/loans`),
  
  getCards: (cif: string) =>
    apiClient.get(`/api/v1/bfsi/customers/${cif}/cards`),
  
  getTransactions: (cif: string, params?: { limit?: number }) =>
    apiClient.get(`/api/v1/bfsi/customers/${cif}/transactions`, { params }),
  
  query: (data: { cif: string; queryType: string; params?: any }) =>
    apiClient.post('/api/v1/bfsi/query', data),
};
