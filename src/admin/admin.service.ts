import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly repo: Repository<SystemSetting>,
  ) {}

  listSettings(): Promise<SystemSetting[]> {
    return this.repo.find({ order: { key: 'ASC' } });
  }

  async getNumber(key: string, defaultValue: number): Promise<number> {
    const row = await this.repo.findOne({ where: { key } });
    if (!row?.value?.length) return defaultValue;
    const n = parseInt(row.value, 10);
    return Number.isFinite(n) && n >= 0 ? n : defaultValue;
  }

  async upsert(key: string, value: string): Promise<SystemSetting> {
    let row = await this.repo.findOne({ where: { key } });
    if (!row) {
      row = this.repo.create({ key, value });
    } else {
      row.value = value;
    }
    return this.repo.save(row);
  }
}
