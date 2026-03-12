import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { PasswordService } from '../auth/password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private passwordService: PasswordService,
  ) {}

  async findAll(query: QueryUsersDto) {
    const { page = 1, limit = 20, search, isActive, role } = query;
    const skip = (page - 1) * limit;

    const qb = this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .skip(skip)
      .take(limit)
      .orderBy('user.createdAt', 'DESC');

    if (search) {
      qb.andWhere(
        '(user.username ILIKE :search OR user.email ILIKE :search OR user.fullName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive });
    }

    if (role) {
      qb.andWhere('role.name = :role', { role });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map(u => this.toResponse(u)),
      total,
      page,
      limit,
    };
  }

  async findById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return this.toResponse(user);
  }

  async create(dto: CreateUserDto, requestingTenantId: string) {
    const passwordHash = await this.passwordService.hash(dto.password);

    const roles = dto.roles.length > 0
      ? await this.roleRepository.find({
          where: dto.roles.map(name => ({ name, tenantId: dto.tenantId || requestingTenantId })),
        })
      : [];

    const user = this.userRepository.create({
      username: dto.username,
      email: dto.email,
      fullName: dto.fullName,
      passwordHash,
      tenantId: dto.tenantId || requestingTenantId,
      roles,
      isActive: true,
      failedLoginAttempts: 0,
      mfaEnabled: false,
    });

    const saved = await this.userRepository.save(user);
    const withRoles = await this.userRepository.findOne({
      where: { id: saved.id },
      relations: ['roles'],
    });

    return this.toResponse(withRoles!);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    if (dto.email !== undefined) user.email = dto.email;
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    if (dto.roles !== undefined) {
      user.roles = dto.roles.length > 0
        ? await this.roleRepository.find({
            where: dto.roles.map(name => ({ name, tenantId: user.tenantId })),
          })
        : [];
    }

    const saved = await this.userRepository.save(user);
    const withRoles = await this.userRepository.findOne({
      where: { id: saved.id },
      relations: ['roles'],
    });

    return this.toResponse(withRoles!);
  }

  async deactivate(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    await this.userRepository.update(id, { isActive: false });
    return { message: 'User deactivated successfully' };
  }

  private toResponse(user: User) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      agentId: user.agentId,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
      tenantId: user.tenantId,
      roles: user.roles?.map(r => r.name) ?? [],
      permissions: user.roles?.flatMap(r => r.permissions) ?? [],
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
