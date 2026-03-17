import { Controller, Get, Param, Query } from '@nestjs/common';
import { BFSIService } from './bfsi.service';
import { QueryTransactionsDto } from './dto/bfsi.dto';

@Controller('bfsi')
export class BFSIController {
  constructor(private bfsiService: BFSIService) {}

  // All products for a CIF (optional ?type= filter)
  @Get('customers/:cif/products')
  queryProducts(@Param('cif') cif: string, @Query('type') type?: string) {
    const tenantId = '123e4567-e89b-12d3-a456-426614174000';
    return this.bfsiService.queryProducts(cif, tenantId, type);
  }

  // Separate endpoints per product type
  @Get('customers/:cif/accounts')
  getAccounts(@Param('cif') cif: string) {
    const tenantId = '123e4567-e89b-12d3-a456-426614174000';
    return this.bfsiService.queryProducts(cif, tenantId, 'account');
  }

  @Get('customers/:cif/savings')
  getSavings(@Param('cif') cif: string) {
    const tenantId = '123e4567-e89b-12d3-a456-426614174000';
    return this.bfsiService.queryProducts(cif, tenantId, 'savings');
  }

  @Get('customers/:cif/loans')
  getLoans(@Param('cif') cif: string) {
    const tenantId = '123e4567-e89b-12d3-a456-426614174000';
    return this.bfsiService.queryProducts(cif, tenantId, 'loan');
  }

  @Get('customers/:cif/cards')
  getCards(@Param('cif') cif: string) {
    const tenantId = '123e4567-e89b-12d3-a456-426614174000';
    return this.bfsiService.queryProducts(cif, tenantId, 'card');
  }

  @Get('customers/:cif/transactions')
  queryTransactions(
    @Param('cif') cif: string,
    @Query() dto: QueryTransactionsDto,
  ) {
    return this.bfsiService.queryTransactionsByCif(cif, dto.limit);
  }

  @Get('health/circuit-breaker')
  getCircuitBreakerState() {
    return { state: this.bfsiService.getCircuitBreakerState() };
  }
}
