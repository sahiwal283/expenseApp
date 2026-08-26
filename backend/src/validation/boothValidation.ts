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
  if (body.weight_source && !WEIGHT_SOURCES.includes(body.weight_source as string)) {
    throw new ValidationError(`weight_source must be one of: ${WEIGHT_SOURCES.join(', ')}`);
  }
  if (body.weight_unit && !['lb', 'kg'].includes(body.weight_unit as string)) {
    throw new ValidationError('weight_unit must be lb or kg');
  }
}

export function validateContainerBody(body: Record<string, unknown>): void {
  if (body.type && !CONTAINER_TYPES.includes(body.type as string)) {
    throw new ValidationError(`type must be one of: ${CONTAINER_TYPES.join(', ')}`);
  }
  if (body.current_status && !CONTAINER_STATUSES.includes(body.current_status as string)) {
    throw new ValidationError(`current_status must be one of: ${CONTAINER_STATUSES.join(', ')}`);
  }
  validateWeightFields(body);
}

/**
 * Hybrid granularity guard. The DB constraint booth_components_instance_qty
 * already enforces this; this turns it into a readable 400 instead of a raw
 * constraint violation surfacing as a 500.
 */
export function assertGranularity(body: Record<string, unknown>): void {
  const hasTag = body.asset_tag !== undefined && body.asset_tag !== null && body.asset_tag !== '';
  const qty = body.quantity;
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
  assertGranularity(body);
  if (body.category && !COMPONENT_CATEGORIES.includes(body.category as string)) {
    throw new ValidationError(`category must be one of: ${COMPONENT_CATEGORIES.join(', ')}`);
  }
  if (body.current_status && !COMPONENT_STATUSES.includes(body.current_status as string)) {
    throw new ValidationError(`current_status must be one of: ${COMPONENT_STATUSES.join(', ')}`);
  }
  if (body.condition && !COMPONENT_CONDITIONS.includes(body.condition as string)) {
    throw new ValidationError(`condition must be one of: ${COMPONENT_CONDITIONS.join(', ')}`);
  }
  validateWeightFields(body);
}
