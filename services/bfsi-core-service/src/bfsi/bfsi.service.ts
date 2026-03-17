import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankProduct } from '../entities';
import { MockCoreBankingAdapter } from '../adapters/core-banking.adapter';
import { CircuitBreaker } from '../utils/circuit-breaker';

@Injectable()
export class BFSIService {
  private cbsAdapter = new MockCoreBankingAdapter();
  private circuitBreaker = new CircuitBreaker(5, 30000);

  constructor(
    @InjectRepository(BankProduct)
    private productRepo: Repository<BankProduct>,
  ) {}

  async queryProducts(cif: string, tenantId: string, type?: string) {
    try {
      const products = await this.circuitBreaker.execute(() =>
        this.cbsAdapter.queryProducts(cif)
      );

      let filtered = products;
      if (type) {
        filtered = products.filter((p: any) => p.type === type);
      }

      return filtered.map((p: any) => ({
        ...p,
        accountNumber: p.accountNumber ? this.maskAccountNumber(p.accountNumber) : null,
      }));
    } catch (error) {
      const cached = await this.productRepo.find({
        where: { tenantId, customerId: cif },
      });

      return {
        products: cached,
        stale: true,
        message: 'Returning cached data - Core Banking System unavailable',
      };
    }
  }

  async queryTransactionsByCif(cif: string, limit: number = 20) {
    try {
      return await this.circuitBreaker.execute(() =>
        this.cbsAdapter.queryTransactions(cif, limit)
      );
    } catch (error) {
      throw new Error('Core Banking System unavailable');
    }
  }

  private maskAccountNumber(accountNumber: string): string {
    if (!accountNumber || accountNumber.length < 4) return accountNumber;
    return '*'.repeat(Math.max(0, accountNumber.length - 4)) + accountNumber.slice(-4);
  }

  getCircuitBreakerState() {
    return this.circuitBreaker.getState();
  }
}
