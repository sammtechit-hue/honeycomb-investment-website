import { Injectable } from '@nestjs/common';

@Injectable()
export class NomineeService {
    constructor() { }

    async findAll({
        search,
        status,
        category,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
    }: {
        search?: string;
        status?: string;
        category?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }) {
        return "all Nominees";
    }

    async findOne(id: string) {
    return id + 'This route is for seeing Nominee';
  }

   async create( dto: Dto) {
      const { title } = dto;
  
      return {
        message: 'nominee Created Successfully',
      };
    }

    async update(id: string, dto: Dto) {
        return {
          message: 'nominee Updated Successfully',
        };
      }

}
