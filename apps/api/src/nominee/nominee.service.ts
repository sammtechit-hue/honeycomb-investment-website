import { Injectable } from '@nestjs/common';
import type {
    NomineeCreateInput,
    NomineeQuery,
    NomineeUpdateInput,
} from '@investment-platform/contracts/nominee';

@Injectable()
export class NomineeService {
    constructor() { }

    // For Getting All Nominee's Data with filtering, searching, sorting & pagination
    // Example: GET /nominee?search=Ayesha&page=1&limit=10
    // Validated/normalized by NomineeQueryDto — all fields are typed.
    async findAll(query: NomineeQuery) {
        return 'all Nominees';
    }

    // For Getting One Nominee's Data
    async findOne(id: string) {
        return id + 'This route is for seeing Nominee';
    }

    // For Creating Nominee
    // Validated by CreateNomineeDto — see packages/contracts/src/nominee.ts.
    async create(createNomineeDto: NomineeCreateInput) {
        return {
            message: 'nominee Created Successfully',
            data: createNomineeDto,
        };
    }

    // For updating Nominee Information
    // Only the fields provided in the request will be updated.
    async update(id: string, updateNomineeDto: NomineeUpdateInput) {
        return {
            message: 'nominee Updated Successfully',
            data: updateNomineeDto,
        };
    }
}
