import { describe, it, expect } from 'vitest';
import {
  assertGranularity,
  validateComponentBody,
  validateContainerBody,
  validateWeightFields,
  normaliseAssetTag,
} from '../../src/validation/boothValidation';
import { ValidationError } from '../../src/utils/errors';

describe('assertGranularity — hybrid granularity truth table', () => {
  it('asset_tag set, quantity omitted: passes (effective quantity defaults to 1)', () => {
    expect(() => assertGranularity({ asset_tag: 'TAG1' })).not.toThrow();
  });

  it('asset_tag set, quantity 1: passes', () => {
    expect(() => assertGranularity({ asset_tag: 'TAG1', quantity: 1 })).not.toThrow();
  });

  it('asset_tag set, quantity 5: throws ValidationError', () => {
    expect(() => assertGranularity({ asset_tag: 'TAG1', quantity: 5 })).toThrow(ValidationError);
  });

  it('asset_tag null, quantity 6: passes (a counted pool)', () => {
    expect(() => assertGranularity({ asset_tag: null, quantity: 6 })).not.toThrow();
  });

  it('quantity 0: throws (not a positive integer)', () => {
    expect(() => assertGranularity({ quantity: 0 })).toThrow(ValidationError);
  });

  it('quantity -1: throws', () => {
    expect(() => assertGranularity({ quantity: -1 })).toThrow(ValidationError);
  });

  it('quantity 2.5: throws (not an integer)', () => {
    expect(() => assertGranularity({ quantity: 2.5 })).toThrow(ValidationError);
  });

  it('quantity as numeric string "3": accepted — Number() coercion treats it as 3', () => {
    // Documented behaviour: the guard coerces with Number() before checking,
    // so a numeric string round-trips the same as a number.
    expect(() => assertGranularity({ quantity: '3' })).not.toThrow();
  });

  it('merged state: body sets only asset_tag over an existing pooled row (quantity 6) — throws', () => {
    const existing = { quantity: 6, asset_tag: null };
    const body = { asset_tag: 'T' };
    expect(() => assertGranularity({ ...existing, ...body })).toThrow(ValidationError);
  });

  it('merged state: body sets only quantity over an existing tagged row (asset_tag set) — throws', () => {
    const existing = { asset_tag: 'T', quantity: 1 };
    const body = { quantity: 5 };
    expect(() => assertGranularity({ ...existing, ...body })).toThrow(ValidationError);
  });

  it('merged state: body sets only asset_tag over an existing tagged row with quantity 1 — passes', () => {
    const existing = { asset_tag: 'OLD-TAG', quantity: 1 };
    const body = { asset_tag: 'NEW-TAG' };
    expect(() => assertGranularity({ ...existing, ...body })).not.toThrow();
  });
});

describe('normaliseAssetTag', () => {
  it('turns an empty string into null', () => {
    const body: Record<string, unknown> = { asset_tag: '' };
    normaliseAssetTag(body);
    expect(body.asset_tag).toBeNull();
  });

  it('turns a whitespace-only string into null', () => {
    const body: Record<string, unknown> = { asset_tag: '   ' };
    normaliseAssetTag(body);
    expect(body.asset_tag).toBeNull();
  });

  it('leaves a real tag untouched', () => {
    const body: Record<string, unknown> = { asset_tag: 'TAG1' };
    normaliseAssetTag(body);
    expect(body.asset_tag).toBe('TAG1');
  });

  it('leaves null and undefined untouched', () => {
    const withNull: Record<string, unknown> = { asset_tag: null };
    normaliseAssetTag(withNull);
    expect(withNull.asset_tag).toBeNull();

    const withUndefined: Record<string, unknown> = {};
    normaliseAssetTag(withUndefined);
    expect(withUndefined.asset_tag).toBeUndefined();
  });
});

describe('validateComponentBody', () => {
  it('asset_tag "" + quantity 5: passes after normalisation, and the tag becomes null', () => {
    const body: Record<string, unknown> = { asset_tag: '', quantity: 5 };
    expect(() => validateComponentBody(body)).not.toThrow();
    expect(body.asset_tag).toBeNull();
  });

  it('category "": throws instead of silently passing (truthy-guard defect)', () => {
    expect(() => validateComponentBody({ category: '' })).toThrow(ValidationError);
  });

  it('current_status "": throws', () => {
    expect(() => validateComponentBody({ current_status: '' })).toThrow(ValidationError);
  });

  it('condition "": throws', () => {
    expect(() => validateComponentBody({ condition: '' })).toThrow(ValidationError);
  });

  it('a valid pool body passes', () => {
    expect(() =>
      validateComponentBody({ category: 'frame_part', quantity: 6, asset_tag: null })
    ).not.toThrow();
  });

  it('a valid tagged body passes', () => {
    expect(() =>
      validateComponentBody({ category: 'frame', quantity: 1, asset_tag: 'FAB-01' })
    ).not.toThrow();
  });
});

describe('validateContainerBody', () => {
  it('normalises an empty asset_tag to null', () => {
    const body: Record<string, unknown> = { asset_tag: '' };
    validateContainerBody(body);
    expect(body.asset_tag).toBeNull();
  });

  it('type "": throws instead of silently passing', () => {
    expect(() => validateContainerBody({ type: '' })).toThrow(ValidationError);
  });

  it('current_status "": throws', () => {
    expect(() => validateContainerBody({ current_status: '' })).toThrow(ValidationError);
  });
});

describe('validateWeightFields', () => {
  it('weight_source "": throws instead of silently passing', () => {
    expect(() => validateWeightFields({ weight_source: '' })).toThrow(ValidationError);
  });

  it('weight_source explicit null: passes (clears provenance, nullable column)', () => {
    expect(() => validateWeightFields({ weight_source: null })).not.toThrow();
  });

  it('weight_source omitted: passes (no change)', () => {
    expect(() => validateWeightFields({})).not.toThrow();
  });

  it('weight_unit "": throws (NOT NULL column, no valid empty state)', () => {
    expect(() => validateWeightFields({ weight_unit: '' })).toThrow(ValidationError);
  });

  it('weight_unit null: throws (NOT NULL column)', () => {
    expect(() => validateWeightFields({ weight_unit: null })).toThrow(ValidationError);
  });
});
