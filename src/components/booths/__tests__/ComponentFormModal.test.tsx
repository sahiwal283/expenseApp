import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentFormModal } from '../ComponentFormModal';
import { boothApi } from '../../../utils/boothApi';

vi.mock('../../../utils/boothApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/boothApi')>();
  return {
    ...actual,
    boothApi: { createComponent: vi.fn(), updateComponent: vi.fn(), listContainers: vi.fn() },
  };
});

describe('ComponentFormModal granularity toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(boothApi.listContainers).mockResolvedValue([] as any);
  });

  it('shows a quantity field by default', async () => {
    render(<ComponentFormModal boothId="b1" onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(await screen.findByLabelText(/quantity/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/asset tag/i)).not.toBeInTheDocument();
  });

  it('swaps quantity for asset tag when tracking individually', async () => {
    render(<ComponentFormModal boothId="b1" onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(await screen.findByLabelText(/track this piece individually/i));
    expect(screen.getByLabelText(/asset tag/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/quantity/i)).not.toBeInTheDocument();
  });

  it('submits quantity and no asset tag in pooled mode', async () => {
    vi.mocked(boothApi.createComponent).mockResolvedValue({ id: 'c1' } as any);
    render(<ComponentFormModal boothId="b1" onClose={vi.fn()} onSaved={vi.fn()} />);

    await userEvent.type(await screen.findByLabelText(/^name/i), 'Frame pole');
    await userEvent.clear(screen.getByLabelText(/quantity/i));
    await userEvent.type(screen.getByLabelText(/quantity/i), '6');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(vi.mocked(boothApi.createComponent)).toHaveBeenCalledWith('b1',
        expect.objectContaining({ name: 'Frame pole', quantity: 6, asset_tag: null }));
    });
  });

  it('submits asset tag and quantity 1 in instance mode', async () => {
    vi.mocked(boothApi.createComponent).mockResolvedValue({ id: 'c1' } as any);
    render(<ComponentFormModal boothId="b1" onClose={vi.fn()} onSaved={vi.fn()} />);

    await userEvent.type(await screen.findByLabelText(/^name/i), 'Fabric graphic');
    await userEvent.click(screen.getByLabelText(/track this piece individually/i));
    await userEvent.type(screen.getByLabelText(/asset tag/i), 'FAB-01');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(vi.mocked(boothApi.createComponent)).toHaveBeenCalledWith('b1',
        expect.objectContaining({ name: 'Fabric graphic', asset_tag: 'FAB-01', quantity: 1 }));
    });
  });

  it('requires an asset tag when tracking individually', async () => {
    render(<ComponentFormModal boothId="b1" onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.type(await screen.findByLabelText(/^name/i), 'Fabric');
    await userEvent.click(screen.getByLabelText(/track this piece individually/i));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/asset tag is required/i);
    expect(vi.mocked(boothApi.createComponent)).not.toHaveBeenCalled();
  });
});
