import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Product } from './product.entity';
import { ProductBadge } from '../common/enums';

export interface CatalogQuery {
  line?: string;
  search?: string;
  badge?: ProductBadge;
  activeOnly?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Product) private readonly repo: Repository<Product>,
  ) {}

  async findAll(q: CatalogQuery) {
    const page  = Math.max(1, q.page  ?? 1);
    const limit = Math.min(100, q.limit ?? 20);
    const skip  = (page - 1) * limit;

    const where: FindOptionsWhere<Product> = {};
    if (q.activeOnly !== false) where.active = true;
    if (q.line)  where.line  = q.line;
    if (q.badge) where.badge = q.badge;

    const [products, total] = await this.repo.findAndCount({
      where: q.search
        ? [
            { ...where, name: Like(`%${q.search}%`) },
            { ...where, ref:  Like(`%${q.search}%`) },
          ]
        : where,
      order: { line: 'ASC', name: 'ASC' },
      skip,
      take: limit,
    });

    return {
      data: products.map((p) => this.toDto(p)),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const p = await this.repo.findOneByOrFail({ id });
    return this.toDto(p);
  }

  private toDto(p: Product) {
    return {
      id:          p.id,
      ref:         p.ref,
      name:        p.name,
      line:        p.line,
      priceMayo:   Number(p.priceMayo),
      pvpSugerido: Math.round((Number(p.priceMayo) * 1.35) / 100) * 100,
      packSize:    p.packSize,
      stock:       p.stock,
      badge:       p.badge,
      imageUrl:    p.imageUrl ?? null,
      active:      p.active,
    };
  }
}
