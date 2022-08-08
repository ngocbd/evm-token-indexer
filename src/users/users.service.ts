import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entity/user.entity';
import { PaginationDto } from 'src/shared/dtos/pagination.dto';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async find(dto: PaginationDto): Promise<User[]> {
    const skip = dto.page && dto.size ? dto.page * dto.size : 0;
    return await this.userRepo.find({ skip: skip, take: dto.size ?? 10 });
  }

  findOne(id: number) {
    return this.userRepo.findOneBy({ id: id });
  }
}
