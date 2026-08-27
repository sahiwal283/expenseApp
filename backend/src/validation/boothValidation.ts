/**
 * Booth inventory request validation.
 *
 * Lives outside routes/ so booths.ts can validate nested container and
 * component creates without importing a sibling route file.
 */

import { ValidationError } from '../utils/errors';
import {
  CONTAINER_TYPES, CONTAINER_STATUSES, WEIGHT_SOURCES,
} from '../database/repositories/BoothContainerRepository';
import {
  COMPONENT_CATEGORIES, COMPONENT_STATUSES, COMPONENT_CONDITIONS,
} from '../database/repositories/BoothComponentRepository';

export function validateWeightFields(body: Record<string, unknown>): void {
  // weight_source is nullable in the DB (the CHECK constraint allows NULL) —
  // an explicit null clears it, so only reject non-null values outside the
  // enum. Absent (undefined) means "no change" and is skipped entirely.
  if (
    body.weight_source !== undefined && body.weight_source !== null &&
    !WEIGHT_SOURCES.includes(body.weight_source as string)
  ) {
    throw new ValidationError(`weight_source must be one of: ${WEIGHT_SOURCES.join(', ')}`);
  }
  // weight_unit is NOT NULL, so — unlike weight_source — null is not a valid
  // value here and falls through to the rejection below.
  if (body.weight_unit !== undefined && !['lb', 'kg'].includes(body.weight_unit as string)) {
    throw new ValidationError('weight_unit must be lb or kg');
  }
}

/**
 * An empty or whitespace-only tag means untagged. Normalise to NULL so the
 * partial unique index (idx_booth_components_asset_tag) and the
 * booth_components_instance_qty CHECK both see it the same way NULL does.
 * Mutates `body` in place so the normalised value is what reaches the
 * repository, not just what the validator sees.
 */
export function normaliseAssetTag(body: Record<string, unknown>): void {
  if (typeof body.asset_tag === 'string' && body.asset_tag.trim() === '') {
    body.asset_tag = null;
  }
}

export function validateContainerBody(body: Record<string, unknown>): void {
  normaliseAssetTag(body);
  if (body.type !== undefined && !CONTAINER_TYPES.includes(body.type as string)) {
    throw new ValidationError(`type must be one of: ${CONTAINER_TYPES.join(', ')}`);
  }
  if (body.current_status !== undefined && !CONTAINER_STATUSES.includes(body.current_status as string)) {
    throw new ValidationError(`current_status must be one of: ${CONTAINER_STATUSES.join(', ')}`);
  }
  validateWeightFields(body);
}

/**
 * Hybrid granularity guard. The DB constraint booth_components_instance_qty
 * already enforces this; this turns it into a readable 400 instead of a raw
 * constraint violation surfacing as a 500.
 *
 * Granularity is a property of the RESULTING row, not of a PATCH body in
 * isolation — a PATCH that sets only one side of the asset_tag/quantity pair
 * must still be checked against what the other side already is. Callers
 * that validate a PATCH MUST pass the merged { ...existing, ...body } state,
 * not the raw request body (see the PATCH handler in routes/boothComponents.ts).
 */
export function assertGranularity(body: Record<string, unknown>): void {
  const hasTag = body.asset_tag !== undefined && body.asset_tag !== null && body.asset_tag !== '';
  // An absent quantity defaults to 1 in the DB when asset_tag is set — make
  // that intent explicit here instead of leaning on the schema default.
  const qty = body.quantity !== undefined ? body.quantity : (hasTag ? 1 : undefined);
  if (hasTag && qty !== undefined && Number(qty) !== 1) {
    throw new ValidationError(
      'A component with an asset_tag is a single tracked item and must have quantity 1. ' +
      'Drop the asset_tag to track it as a counted pool instead.'
    );
  }
  if (qty !== undefined && (!Number.isInteger(Number(qty)) || Number(qty) < 1)) {
    throw new ValidationError('quantity must be a positive integer');
  }
}

export function validateComponentBody(body: Record<string, unknown>): void {
  normaliseAssetTag(body);
  assertGranularity(body);
  if (body.category !== undefined && !COMPONENT_CATEGORIES.includes(body.category as string)) {
    throw new ValidationError(`category must be one of: ${COMPONENT_CATEGORIES.join(', ')}`);
  }
  if (body.current_status !== undefined && !COMPONENT_STATUSES.includes(body.current_status as string)) {
    throw new ValidationError(`current_status must be one of: ${COMPONENT_STATUSES.join(', ')}`);
  }
  if (body.condition !== undefined && !COMPONENT_CONDITIONS.includes(body.condition as string)) {
    throw new ValidationError(`condition must be one of: ${COMPONENT_CONDITIONS.join(', ')}`);
  }
  validateWeightFields(body);
}
