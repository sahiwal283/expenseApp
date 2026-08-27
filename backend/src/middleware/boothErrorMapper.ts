/**
 * Booth Postgres Error Mapper
 *
 * No booth route mapped Postgres constraint violations to actionable
 * responses — a duplicate `asset_tag`, a `default_container_id` pointing at
 * nothing, or a non-UUID `:id` route param all fell through as a raw 500
 * "Internal server error". `events.ts`/`users.ts`/`auth.ts` map `23505`/
 * `23503` themselves at the route level; `BoothManifestService.assignBooth`
 * already maps `23505` for the assignment-conflict case the same way. This
 * covers the rest of the booth surface with one small piece shared by all
 * six booth route files, rather than repeating try/catch in each of them.
 *
 * Two error shapes reach this middleware:
 *  - Raw `pg` errors, from services that run their own `client.query`/
 *    `dbQuery` inside a transaction (BoothInventoryService, BoothPackingService,
 *    BoothManifestService) and rethrow unchanged.
 *  - `DatabaseError`, from repository methods that go through
 *    `BaseRepository.executeQuery`, which wraps every failure — including
 *    these same pg codes — into a generic 500 before it gets here.
 *    `DatabaseError` carries `pgCode`/`pgConstraint`/`pgDetail` for exactly
 *    this reason (see utils/errors/AppError.ts).
 *
 * Mounted as `router.use(boothErrorMapper)` at the end of each booth route
 * file (after all routes, before `export default router`), so it only ever
 * sees errors `next()`-ed from that router — no other route in the app is
 * affected.
 */

import { NextFunction, Request, Response } from 'express';
import { ConflictError, ValidationError, DatabaseError } from '../utils/errors';

interface PgErrorInfo {
  code?: string;
  constraint?: string;
  detail?: string;
}

function pgInfo(err: unknown): PgErrorInfo {
  if (err instanceof DatabaseError) {
    return { code: err.pgCode, constraint: err.pgConstraint, detail: err.pgDetail };
  }
  const e = err as { code?: unknown; constraint?: unknown; detail?: unknown } | null | undefined;
  return {
    code: typeof e?.code === 'string' ? e.code : undefined,
    constraint: typeof e?.constraint === 'string' ? e.constraint : undefined,
    detail: typeof e?.detail === 'string' ? e.detail : undefined,
  };
}

/** Postgres unique-violation detail looks like `Key (asset_tag)=(ABC1) already exists.` */
function fieldFromDetail(detail?: string): string | null {
  const match = detail?.match(/^Key \(([^)]+)\)=/);
  return match ? match[1].split(',')[0].trim() : null;
}

function fieldFromConstraint(constraint?: string): string | null {
  if (!constraint) return null;
  if (constraint.includes('asset_tag')) return 'asset_tag';
  return null;
}

function humanField(field: string): string {
  return field.replace(/_/g, ' ');
}

/**
 * Maps the three Postgres error codes actually reachable from booth-inventory
 * write paths to actionable AppErrors. Returns null for anything else, so the
 * caller can pass the original error through unchanged (never swallow an
 * error we don't understand).
 */
export function mapBoothPgError(err: unknown): Error | null {
  const { code, constraint, detail } = pgInfo(err);
  if (!code) return null;

  switch (code) {
    case '23505': {
      const field = fieldFromDetail(detail) ?? fieldFromConstraint(constraint) ?? 'value';
      return new ConflictError(`That ${humanField(field)} is already in use`);
    }
    case '23503':
      return new ValidationError('Referenced location or container does not exist');
    case '22P02':
      return new ValidationError('Invalid id format');
    default:
      return null;
  }
}

/** Express error middleware — mount at the end of each booth route file. */
export function boothErrorMapper(err: unknown, _req: Request, _res: Response, next: NextFunction): void {
  next(mapBoothPgError(err) ?? err);
}
