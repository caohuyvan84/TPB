import { useQuery } from '@tanstack/react-query';
import { bfsiApi } from '../lib/bfsi-api';

export const useBankAccounts = (cif: string) =>
  useQuery({
    queryKey: ['bfsi', 'accounts', cif],
    queryFn: () => bfsiApi.getAccounts(cif),
    enabled: !!cif,
    staleTime: 60000,
  });

export const useSavingsProducts = (cif: string) =>
  useQuery({
    queryKey: ['bfsi', 'savings', cif],
    queryFn: () => bfsiApi.getSavings(cif),
    enabled: !!cif,
    staleTime: 60000,
  });

export const useLoanProducts = (cif: string) =>
  useQuery({
    queryKey: ['bfsi', 'loans', cif],
    queryFn: () => bfsiApi.getLoans(cif),
    enabled: !!cif,
    staleTime: 60000,
  });

export const useCardProducts = (cif: string) =>
  useQuery({
    queryKey: ['bfsi', 'cards', cif],
    queryFn: () => bfsiApi.getCards(cif),
    enabled: !!cif,
    staleTime: 60000,
  });

export const useBfsiTransactions = (cif: string, params?: { limit?: number }) =>
  useQuery({
    queryKey: ['bfsi', 'transactions', cif, params],
    queryFn: () => bfsiApi.getTransactions(cif, params),
    enabled: !!cif,
    staleTime: 30000,
  });
