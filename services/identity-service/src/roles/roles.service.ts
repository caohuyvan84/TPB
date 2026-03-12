import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async findAll(tenantId: string) {
    return this.roleRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findById(id: string) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role ${id} not found`);
    }
    return role;
  }

  async create(dto: CreateRoleDto, tenantId: string) {
    const existing = await this.roleRepository.findOne({
      where: { name: dto.name, tenantId },
    });

    if (existing) {
      throw new ConflictException(`Role '${dto.name}' already exists`);
    }

    const role = this.roleRepository.create({
      name: dto.name,
      description: dto.description,
      permissions: dto.permissions,
      tenantId,
    });

    return this.roleRepository.save(role);
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role ${id} not found`);
    }

    if (dto.name !== undefined) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.permissions !== undefined) role.permissions = dto.permissions;

    return this.roleRepository.save(role);
  }

  async delete(id: string) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role ${id} not found`);
    }

    await this.roleRepository.remove(role);
    return { message: 'Role deleted successfully' };
  }
}
