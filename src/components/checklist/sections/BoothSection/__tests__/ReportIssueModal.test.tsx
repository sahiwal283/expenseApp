import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportIssueModal } from '../ReportIssueModal';
import { boothApi } from '../../../../../utils/boothApi';

// Partial mock: only boothApi's network calls are replaced. humanise() and the
// other named exports must stay real — sibling components in this module import
// humanise directly, and a full-object mock would leave it undefined.
vi.mock('../../../../../utils/boothApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../utils/boothApi')>();
  return {
    ...actual,
    boothApi: { reportComponent: vi.fn(), uploadAttachment: vi.fn() },
  };
});

const movement = { id: 'mv-1', component_id: 'c1', container_id: null, event_type: 'report' };

function makePhoto(name = 'damage.jpg') {
  return new File(['data'], name, { type: 'image/jpeg' });
}

describe('ReportIssueModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the report even when the photo upload fails, and still calls onReported', async () => {
    vi.mocked(boothApi.reportComponent).mockResolvedValue(movement as any);
    vi.mocked(boothApi.uploadAttachment).mockRejectedValue(new Error('network down'));
    const onReported = vi.fn();

    render(
      <ReportIssueModal componentId="c1" componentName="Frame pole" eventId="e1"
                         onClose={vi.fn()} onReported={onReported} />
    );

    const fileInput = screen.getByLabelText(/photo/i);
    await userEvent.upload(fileInput, makePhoto());
    await userEvent.click(screen.getByRole('button', { name: /report issue/i }));

    expect(await screen.findByText(/photo will upload when you're back online/i)).toBeInTheDocument();
    expect(onReported).toHaveBeenCalledTimes(1);
  });

  it('reports cleanly with no failure notice when both the report and photo succeed', async () => {
    vi.mocked(boothApi.reportComponent).mockResolvedValue(movement as any);
    vi.mocked(boothApi.uploadAttachment).mockResolvedValue({} as any);
    const onReported = vi.fn();

    render(
      <ReportIssueModal componentId="c1" componentName="Frame pole" eventId="e1"
                         onClose={vi.fn()} onReported={onReported} />
    );

    await userEvent.upload(screen.getByLabelText(/photo/i), makePhoto());
    await userEvent.click(screen.getByRole('button', { name: /report issue/i }));

    await vi.waitFor(() => expect(onReported).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/photo will upload/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('attaches the photo to the movement returned by the report, not to the component', async () => {
    vi.mocked(boothApi.reportComponent).mockResolvedValue(movement as any);
    vi.mocked(boothApi.uploadAttachment).mockResolvedValue({} as any);

    render(
      <ReportIssueModal componentId="c1" componentName="Frame pole" eventId="e1"
                         onClose={vi.fn()} onReported={vi.fn()} />
    );

    await userEvent.upload(screen.getByLabelText(/photo/i), makePhoto());
    await userEvent.click(screen.getByRole('button', { name: /report issue/i }));

    await vi.waitFor(() => {
      expect(vi.mocked(boothApi.uploadAttachment)).toHaveBeenCalledWith(
        'movement', movement.id, expect.any(File)
      );
    });
  });

  it('does not call onReported when the report itself fails, and surfaces an error', async () => {
    vi.mocked(boothApi.reportComponent).mockRejectedValue(new Error('server exploded'));
    const onReported = vi.fn();

    render(
      <ReportIssueModal componentId="c1" componentName="Frame pole" eventId="e1"
                         onClose={vi.fn()} onReported={onReported} />
    );

    await userEvent.click(screen.getByRole('button', { name: /report issue/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/server exploded/i);
    expect(onReported).not.toHaveBeenCalled();
    expect(boothApi.uploadAttachment).not.toHaveBeenCalled();
  });

  it('sends the chosen kind — damage or missing — to reportComponent', async () => {
    vi.mocked(boothApi.reportComponent).mockResolvedValue(movement as any);

    render(
      <ReportIssueModal componentId="c1" componentName="Frame pole" eventId="e1"
                         onClose={vi.fn()} onReported={vi.fn()} />
    );

    await userEvent.click(screen.getByRole('radio', { name: /missing/i }));
    await userEvent.click(screen.getByRole('button', { name: /report issue/i }));

    await vi.waitFor(() => {
      expect(vi.mocked(boothApi.reportComponent)).toHaveBeenCalledWith('c1',
        expect.objectContaining({ kind: 'missing' }));
    });
  });

  it('sends an idempotency key with the report', async () => {
    vi.mocked(boothApi.reportComponent).mockResolvedValue(movement as any);

    render(
      <ReportIssueModal componentId="c1" componentName="Frame pole" eventId="e1"
                         onClose={vi.fn()} onReported={vi.fn()} />
    );

    await userEvent.click(screen.getByRole('button', { name: /report issue/i }));

    await vi.waitFor(() => {
      const arg = vi.mocked(boothApi.reportComponent).mock.calls[0][1] as any;
      expect(arg.idempotency_key).toEqual(expect.any(String));
      expect(arg.idempotency_key.length).toBeGreaterThan(0);
    });
  });
});
