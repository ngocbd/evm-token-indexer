import { Controller, Get, Param, Query } from '@nestjs/common';
import { PaginationDto } from 'src/shared/dtos/pagination.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  find(@Query() pagination: PaginationDto) {
    return this.usersService.find(pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }
}
