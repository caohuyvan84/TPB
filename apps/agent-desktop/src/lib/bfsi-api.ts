import { apiClient } from './api-client';

export interface BankAccount {
  type: 'account';
  accountNumber: string; // masked
  productName: string;
  accountType: string;
  balance: number;
  availableBalance: number;
  status: 'active' | 'inactive' | 'frozen';
  currency: string;
  openedAt: string;
  branch?: string;
}

export interface SavingsProduct {
  type: 'savings';
  accountNumber: string;
  productName: string;
  term: string;
  interestRate: number;
  principal: number;
  balance: number;
  status: string;
  currency: string;
  openedAt: string;
  maturityDate?: string;
  autoRenewal?: boolean;
}

export interface LoanProduct {
  type: 'loan';
  accountNumber: string;
  productName: string;
  loanAmount: number;
  currentBalance: number;
  balance: number;
  interestRate: number;
  term: number;
  monthlyPayment: number;
  status: string;
  currency: string;
  openedAt: string;
  maturityDate: string;
  nextPaymentDate?: string;
  overdueAmount?: number;
  overdueDays?: number;
}

export interface CardProduct {
  type: 'card';
  accountNumber: string; // masked
  productName: string;
  cardType: string;
  creditLimit?: number;
  availableBalance?: number;
  balance: number;
  status: 'active' | 'blocked' | 'expired';
  currency: string;
  openedAt: string;
  maturityDate?: string;
  cardholderName?: string;
}

export interface BfsiTransaction {
  id: string;
  amount: number;
  type: 'debit' | 'credit';
  description: string;
  accountNumber: string;
  currency: string;
  balance: number | null;
  timestamp: string;
}

export const bfsiApi = {
  getAccounts: (cif: string): Promise<BankAccount[]> =>
    apiClient.get(`/api/v1/bfsi/customers/${cif}/accounts`).then(r => r.data),

  getSavings: (cif: string): Promise<SavingsProduct[]> =>
    apiClient.get(`/api/v1/bfsi/customers/${cif}/savings`).then(r => r.data),

  getLoans: (cif: string): Promise<LoanProduct[]> =>
    apiClient.get(`/api/v1/bfsi/customers/${cif}/loans`).then(r => r.data),

  getCards: (cif: string): Promise<CardProduct[]> =>
    apiClient.get(`/api/v1/bfsi/customers/${cif}/cards`).then(r => r.data),

  getTransactions: (cif: string, params?: { limit?: number }): Promise<BfsiTransaction[]> =>
    apiClient.get(`/api/v1/bfsi/customers/${cif}/transactions`, { params }).then(r => r.data),

  getAllProducts: (cif: string, type?: string) =>
    apiClient.get(`/api/v1/bfsi/customers/${cif}/products`, { params: type ? { type } : undefined }).then(r => r.data),
};
