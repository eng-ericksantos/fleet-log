import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

const PG_UNIQUE_VIOLATION = '23505';

// Converte violação de UNIQUE do PostgreSQL em 409; qualquer outro erro é relançado intacto.
export function rethrowUniqueViolation(err: unknown, message: string): never {
  if (err instanceof QueryFailedError && (err as QueryFailedError & { code?: string }).code === PG_UNIQUE_VIOLATION) {
    throw new ConflictException(message);
  }
  throw err;
}
