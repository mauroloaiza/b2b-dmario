import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { SessionGuard } from '../auth/session.guard';
import { ProductBadge } from '../common/enums';

@UseGuards(SessionGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly service: CatalogService) {}

  @Get()
  findAll(
    @Query('line')   line?: string,
    @Query('search') search?: string,
    @Query('badge')  badge?: ProductBadge,
    @Query('page')   page?: string,
    @Query('limit')  limit?: string,
  ) {
    return this.service.findAll({
      line,
      search,
      badge,
      page:  page  ? +page  : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
