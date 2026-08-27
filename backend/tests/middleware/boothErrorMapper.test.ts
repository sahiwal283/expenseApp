import { describe, it, expect, vi } from 'vitest';
import { mapBoothPgError, boothErrorMapper } from '../../src/middleware/boothErrorMapper';
import { ConflictError, ValidationError, DatabaseError, NotFoundError } from '../../src/utils/errors';

/** A raw pg error, the shape thrown by services that use `client.query`/`dbQuery` directly. */
function pgError(code: string, extra: Record<string, unknown> = {}): Error {
  return Object.assign(new Error('pg failure'), { code, ...extra });
}

describe('mapBoothPgError', () => {
  it('maps a unique violation (23505) on asset_tag to a 409 ConflictError naming the field', () => {
    const err = pgError('23505', {
      constraint: 'idx_booth_containers_asset_tag',
      detail: 'Key (asset_tag)=(CRATE-9) already exists.',
    });
    const mapped = mapBoothPgError(err);
    expect(mapped).toBeInstanceOf(ConflictError);
    expect((mapped as ConflictError).statusCode).toBe(409);
    expect(mapped!.message).toMatch(/asset tag.*already in use/i);
  });

  it('falls back to the constraint name when detail is unavailable', () => {
    const err = pgError('23505', { constraint: 'idx_booth_components_asset_tag' });
    const mapped = mapBoothPgError(err);
    expect(mapped!.message).toMatch(/asset tag.*already in use/i);
  });

  it('maps a foreign-key violation (23503) to a 400 ValidationError', () => {
    const err = pgError('23503');
    const mapped = mapBoothPgError(err);
    expect(mapped).toBeInstanceOf(ValidationError);
    expect((mapped as ValidationError).statusCode).toBe(400);
    expect(mapped!.message).toMatch(/does not exist/i);
  });

  it('maps invalid UUID text (22P02) — the non-UUID :id case — to a 400 ValidationError', () => {
    const err = pgError('22P02');
    const mapped = mapBoothPgError(err);
    expect(mapped).toBeInstanceOf(ValidationError);
    expect((mapped as ValidationError).statusCode).toBe(400);
  });

  it('returns null for an unrecognised pg code, so the original error passes through', () => {
    const err = pgError('40001'); // serialization failure — not one of the three mapped codes
    expect(mapBoothPgError(err)).toBeNull();
  });

  it('returns null for a plain AppError (e.g. NotFoundError) — never re-wraps it', () => {
    expect(mapBoothPgError(new NotFoundError('Container', 'abc'))).toBeNull();
  });

  it('reads the pg code off a DatabaseError (the BaseRepository.executeQuery wrapping case)', () => {
    // This is the actual failure the review found: BoothContainerRepository/
    // BoothComponentRepository go through executeQuery, which wraps every pg
    // error — including 23505/23503/22P02 — into a generic DatabaseError
    // before a route ever sees it. DatabaseError carries pgCode/pgConstraint/
    // pgDetail for exactly this reason.
    const original = pgError('23505', {
      constraint: 'idx_booth_containers_asset_tag',
      detail: 'Key (asset_tag)=(CRATE-9) already exists.',
    });
    const wrapped = new DatabaseError("Query failed on table 'booth_containers'", original);
    const mapped = mapBoothPgError(wrapped);
    expect(mapped).toBeInstanceOf(ConflictError);
    expect(mapped!.message).toMatch(/asset tag.*already in use/i);
  });

  it('returns null for a DatabaseError from a non-pg failure (no pgCode set)', () => {
    const wrapped = new DatabaseError('boom', new Error('connection lost'));
    expect(mapBoothPgError(wrapped)).toBeNull();
  });
});

describe('boothErrorMapper (express error middleware)', () => {
  it('forwards the mapped AppError to next() when the error matches a known pg code', () => {
    const next = vi.fn();
    const err = pgError('23503');
    boothErrorMapper(err, {} as any, {} as any, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
  });

  it('forwards the original error unchanged when nothing matches', () => {
    const next = vi.fn();
    const err = new NotFoundError('Booth', 'xyz');
    boothErrorMapper(err, {} as any, {} as any, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
