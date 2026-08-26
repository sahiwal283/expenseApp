import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoveModal } from '../MoveModal';
import { boothApi } from '../../../utils/boothApi';

// Partial mock: only boothApi's network calls are replaced. humanise() and the
// other named exports must stay real — MoveModal imports humanise directly
// from this module, and a full-object mock would leave it undefined.
vi.mock('../../../utils/boothApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/boothApi')>();
  return {
    ...actual,
    boothApi: {
      listLocations: vi.fn(),
      moveBooth: vi.fn(),
      moveContainer: vi.fn(),
      moveComponent: vi.fn(),
    },
  };
});

const locations = [{ id: 'l1', name: 'Main Warehouse' }];

async function moveTo(destinationLabel = /main warehouse/i) {
  await userEvent.selectOptions(
    await screen.findByLabelText(/destination location/i),
    screen.getByRole('option', { name: destinationLabel })
  );
  await userEvent.click(screen.getByRole('button', { name: /^move$/i }));
}

describe('MoveModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(boothApi.listLocations).mockResolvedValue(locations as any);
  });

  it('shows the stranded-components warning, saying plainly that they did not move', async () => {
    vi.mocked(boothApi.moveBooth).mockResolvedValue({
      movedBooths: 1, movedContainers: 3, movedComponents: 12,
      strandedComponents: 2, movementIds: ['m1'],
    } as any);
    render(
      <MoveModal target={{ kind: 'booth', id: 'b1', name: 'Vegas Booth' }}
                 onClose={vi.fn()} onMoved={vi.fn()} />
    );

    await moveTo();

    const warning = await screen.findByRole('alert');
    expect(warning).toHaveTextContent(/2/);
    expect(warning).toHaveTextContent(/did not move/i);
  });

  it('omits the stranded warning entirely when nothing was stranded', async () => {
    vi.mocked(boothApi.moveBooth).mockResolvedValue({
      movedBooths: 1, movedContainers: 3, movedComponents: 12,
      strandedComponents: 0, movementIds: ['m1'],
    } as any);
    render(
      <MoveModal target={{ kind: 'booth', id: 'b1', name: 'Vegas Booth' }}
                 onClose={vi.fn()} onMoved={vi.fn()} />
    );

    await moveTo();

    await screen.findByText(/moved/i);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/did not move/i)).not.toBeInTheDocument();
  });

  it('reports the counts of what actually moved', async () => {
    vi.mocked(boothApi.moveBooth).mockResolvedValue({
      movedBooths: 1, movedContainers: 3, movedComponents: 12,
      strandedComponents: 0, movementIds: ['m1'],
    } as any);
    render(
      <MoveModal target={{ kind: 'booth', id: 'b1', name: 'Vegas Booth' }}
                 onClose={vi.fn()} onMoved={vi.fn()} />
    );

    await moveTo();

    const summary = await screen.findByText(/moved/i);
    expect(summary).toHaveTextContent(/1 booth/);
    expect(summary).toHaveTextContent(/3 containers/);
    expect(summary).toHaveTextContent(/12 components/);
  });

  it('generates the idempotency key exactly once for the modal\'s lifetime', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID');
    vi.mocked(boothApi.moveContainer).mockResolvedValue({
      movedBooths: 0, movedContainers: 1, movedComponents: 0,
      strandedComponents: 0, movementIds: ['m1'],
    } as any);

    render(
      <MoveModal target={{ kind: 'container', id: 'k1', name: 'Crate A' }}
                 onClose={vi.fn()} onMoved={vi.fn()} />
    );
    await screen.findByLabelText(/destination location/i);

    // Trigger a re-render before submitting.
    await userEvent.type(screen.getByLabelText(/note/i), 'handle with care');
    expect(uuidSpy).toHaveBeenCalledTimes(1);

    await moveTo();

    expect(uuidSpy).toHaveBeenCalledTimes(1);
    expect(vi.mocked(boothApi.moveContainer)).toHaveBeenCalledWith(
      'k1', expect.objectContaining({ idempotency_key: uuidSpy.mock.results[0].value })
    );
  });

  it('dispatches to moveBooth for a booth target', async () => {
    vi.mocked(boothApi.moveBooth).mockResolvedValue({
      movedBooths: 1, movedContainers: 0, movedComponents: 0,
      strandedComponents: 0, movementIds: [],
    } as any);
    render(
      <MoveModal target={{ kind: 'booth', id: 'b1', name: 'Vegas Booth' }}
                 onClose={vi.fn()} onMoved={vi.fn()} />
    );
    await moveTo();
    expect(vi.mocked(boothApi.moveBooth)).toHaveBeenCalledWith('b1', expect.anything());
    expect(boothApi.moveContainer).not.toHaveBeenCalled();
    expect(boothApi.moveComponent).not.toHaveBeenCalled();
  });

  it('dispatches to moveContainer for a container target', async () => {
    vi.mocked(boothApi.moveContainer).mockResolvedValue({
      movedBooths: 0, movedContainers: 1, movedComponents: 0,
      strandedComponents: 0, movementIds: [],
    } as any);
    render(
      <MoveModal target={{ kind: 'container', id: 'k1', name: 'Crate A' }}
                 onClose={vi.fn()} onMoved={vi.fn()} />
    );
    await moveTo();
    expect(vi.mocked(boothApi.moveContainer)).toHaveBeenCalledWith('k1', expect.anything());
    expect(boothApi.moveBooth).not.toHaveBeenCalled();
    expect(boothApi.moveComponent).not.toHaveBeenCalled();
  });

  it('dispatches to moveComponent for a component target', async () => {
    vi.mocked(boothApi.moveComponent).mockResolvedValue({
      movedBooths: 0, movedContainers: 0, movedComponents: 1,
      strandedComponents: 0, movementIds: [],
    } as any);
    render(
      <MoveModal target={{ kind: 'component', id: 'c1', name: 'Fabric' }}
                 onClose={vi.fn()} onMoved={vi.fn()} />
    );
    await moveTo();
    expect(vi.mocked(boothApi.moveComponent)).toHaveBeenCalledWith('c1', expect.anything());
    expect(boothApi.moveBooth).not.toHaveBeenCalled();
    expect(boothApi.moveContainer).not.toHaveBeenCalled();
  });

  it('surfaces an error instead of appearing to succeed when the move fails', async () => {
    vi.mocked(boothApi.moveBooth).mockRejectedValue(new Error('network down'));
    render(
      <MoveModal target={{ kind: 'booth', id: 'b1', name: 'Vegas Booth' }}
                 onClose={vi.fn()} onMoved={vi.fn()} />
    );

    await moveTo();

    expect(await screen.findByRole('alert')).toHaveTextContent(/network down/i);
    expect(screen.queryByText(/^moved/i)).not.toBeInTheDocument();
  });
});
