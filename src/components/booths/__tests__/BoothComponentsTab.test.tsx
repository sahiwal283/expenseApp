import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BoothComponentsTab } from '../BoothComponentsTab';
import { boothApi } from '../../../utils/boothApi';

vi.mock('../../../utils/boothApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/boothApi')>();
  return {
    ...actual,
    boothApi: { listComponents: vi.fn(), listContainers: vi.fn() },
  };
});

const components = [
  { id: 'c1', booth_id: 'b1', parent_component_id: null, name: 'Frame', category: 'frame',
    quantity: 1, asset_tag: null, condition: 'good', current_status: 'in_storage',
    current_container_id: 'k1', default_container_id: 'k1', weight_value: 40, weight_unit: 'lb' },
  { id: 'c2', booth_id: 'b1', parent_component_id: 'c1', name: 'Cross bar', category: 'frame_part',
    quantity: 4, asset_tag: null, condition: 'good', current_status: 'in_storage',
    current_container_id: 'k1', default_container_id: 'k1', weight_value: 2.5, weight_unit: 'lb' },
  { id: 'c3', booth_id: 'b1', parent_component_id: null, name: 'Fabric', category: 'fabric',
    quantity: 1, asset_tag: 'FAB-01', condition: 'damaged', current_status: 'at_show',
    current_container_id: null, default_container_id: 'k2', weight_value: null, weight_unit: 'lb' },
];

describe('BoothComponentsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(boothApi.listContainers).mockResolvedValue([
      { id: 'k1', name: 'Crate A' }, { id: 'k2', name: 'Crate B' },
    ] as any);
  });

  it('shows a pooled component as a count and a tagged one by its tag', async () => {
    vi.mocked(boothApi.listComponents).mockResolvedValue(components as any);
    render(<BoothComponentsTab boothId="b1" canManage />);
    expect(await screen.findByText('×4')).toBeInTheDocument();
    expect(screen.getByText('FAB-01')).toBeInTheDocument();
  });

  it('indents a child component under its parent', async () => {
    vi.mocked(boothApi.listComponents).mockResolvedValue(components as any);
    render(<BoothComponentsTab boothId="b1" canManage />);
    const child = await screen.findByTestId('component-row-c2');
    expect(child.className).toMatch(/pl-8/);
  });

  it('flags a damaged component', async () => {
    vi.mocked(boothApi.listComponents).mockResolvedValue(components as any);
    render(<BoothComponentsTab boothId="b1" canManage />);
    expect(await screen.findByText(/damaged/i)).toBeInTheDocument();
  });

  it('shows total weight for a pooled component', async () => {
    vi.mocked(boothApi.listComponents).mockResolvedValue(components as any);
    render(<BoothComponentsTab boothId="b1" canManage />);
    // 2.5 lb each × 4 = 10 lb total
    expect(await screen.findByText(/10 lb/)).toBeInTheDocument();
  });

  it('says so plainly when a weight is not recorded', async () => {
    vi.mocked(boothApi.listComponents).mockResolvedValue(components as any);
    render(<BoothComponentsTab boothId="b1" canManage />);
    expect(await screen.findByText(/not recorded/i)).toBeInTheDocument();
  });
});
