import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import axios from 'axios';
import { Customer, CustomerNote } from '../entities';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    @InjectRepository(CustomerNote)
    private noteRepo: Repository<CustomerNote>,
  ) {}

  async searchCustomers(query?: string) {
    if (!query) {
      return this.customerRepo.find({
        order: { createdAt: 'DESC' },
        take: 50,
      });
    }

    return this.customerRepo.find({
      where: [
        { cif: ILike(`%${query}%`) },
        { fullName: ILike(`%${query}%`) },
        { email: ILike(`%${query}%`) },
        { phone: ILike(`%${query}%`) },
      ],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getCustomer(id: string) {
    const customer = await this.customerRepo.findOne({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async getCustomerInteractions(customerId: string) {
    const interactionServiceUrl =
      process.env.INTERACTION_SERVICE_URL || 'http://localhost:3003';
    try {
      const response = await axios.get(
        `${interactionServiceUrl}/api/v1/interactions`,
        { params: { customerId }, timeout: 5000 },
      );
      return response.data;
    } catch (err) {
      this.logger.warn(
        `Could not fetch interactions for customer ${customerId}: ${err instanceof Error ? err.message : err}`,
      );
      return [];
    }
  }

  async getNotes(customerId: string) {
    try {
      return await this.noteRepo
        .createQueryBuilder('note')
        .where('note.customer_id = :customerId', { customerId })
        .orderBy('note.createdAt', 'DESC')
        .getMany();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error getting notes for customer ${customerId}: ${msg}`);
      throw new BadRequestException(`Failed to get notes: ${msg}`);
    }
  }

  async addNote(
    customerId: string,
    agentId: string,
    agentName: string,
    content: string,
  ) {
    await this.getCustomer(customerId);

    try {
      const note = this.noteRepo.create({ customerId, agentId, agentName, content });
      return await this.noteRepo.save(note);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error adding note for customer ${customerId}: ${msg}`);
      throw new BadRequestException(`Failed to add note: ${msg}`);
    }
  }
}
