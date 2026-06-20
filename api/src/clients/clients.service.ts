import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './client.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client) private readonly repo: Repository<Client>,
  ) {}

  async findById(id: string): Promise<Client> {
    const client = await this.repo.findOne({ where: { id }, relations: { vendor: true } });
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return client;
  }

  async getMe(clientId: string) {
    const c = await this.findById(clientId);
    return {
      id:               c.id,
      code:             c.code,
      name:             c.name,
      city:             c.city,
      address:          c.address ?? null,
      segment:          c.segment,
      status:           c.status,
      creditLimit:      Number(c.creditLimit),
      creditUsed:       Number(c.creditUsed),
      creditAvailable:  Number(c.creditLimit) - Number(c.creditUsed),
      ytd:              Number(c.ytd),
      lastOrderAt:      c.lastOrderAt ?? null,
      vendor: c.vendor
        ? { id: c.vendor.id, name: c.vendor.name, zone: c.vendor.zone, email: c.vendor.email, phone: c.vendor.phone }
        : null,
    };
  }
}
