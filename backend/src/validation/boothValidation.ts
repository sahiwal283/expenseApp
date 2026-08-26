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
