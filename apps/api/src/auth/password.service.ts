import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { BCRYPT_ROUNDS } from './auth.constants';

@Injectable()
export class PasswordService {
  // Real bcrypt hash of a random throwaway string, computed once. Compared
  // against when the login identifier matches no user, so "no such account"
  // takes the same ~bcrypt time as "wrong password" and response timing
  // can't be used to discover which emails/phones are registered.
  private readonly dummyHash = bcrypt.hashSync(randomUUID(), BCRYPT_ROUNDS);

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async burnTime(plain: string): Promise<void> {
    await bcrypt.compare(plain, this.dummyHash);
  }

  // True when a stored hash was made with a lower cost than today's — lets
  // login transparently upgrade old hashes after BCRYPT_ROUNDS is raised.
  needsRehash(hash: string): boolean {
    try {
      return bcrypt.getRounds(hash) < BCRYPT_ROUNDS;
    } catch {
      return true;
    }
  }
}
