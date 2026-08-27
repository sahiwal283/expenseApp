/**
 * Event Booth Assignment Repository
 *
 * Which booths are going to which events. The per-container manifest lives in
 * event_booth_manifest_containers and is managed by BoothManifestService.
 */

import { BaseRepository } from './BaseRepository';
import { NotFoundError } from '../../utils/errors';

export interface EventBoothAssignment {
  id: string;
  event_id: string;
  booth_id: string;
  status: string;
  needed_by_date: string | null;
  setup_notes: string | null;
  teardown_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const ASSIGNMENT_STATUSES = [
  'planned', 'preparing', 'shipped', 'at_show', 'returned', 'cancelled',
];

const WRITABLE = ['status', 'needed_by_date', 'setup_notes', 'teardown_notes'] as const;

export class EventBoothAssignmentRepository extends BaseRepository<EventBoothAssignment> {
  protected tableName = 'event_booth_assignments';

  async update(id: string, data: Partial<EventBoothAssignment>): Promise<EventBoothAssignment> {
    const cols = WRITABLE.filter((c) => data[c] !== undefined);
    if (!cols.length) {
      const existing = await this.findById(id);
      if (!existing) throw new NotFoundError('Assignment', id);
      return existing;
    }
    const params: unknown[] = cols.map((c) => data[c]);
    params.push(id);
    const result = await this.executeQuery<EventBoothAssignment>(
      `UPDATE event_booth_assignments
          SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')},
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $${params.length} RETURNING *`,
      params as any[]
    );
    if (!result.rows[0]) throw new NotFoundError('Assignment', id);
    return result.rows[0];
  }

  async remove(id: string): Promise<void> {
    const result = await this.executeQuery(
      `DELETE FROM event_booth_assignments WHERE id = $1 RETURNING id`, [id]
    );
    if (!result.rows[0]) throw new NotFoundError('Assignment', id);
  }
}

export const eventBoothAssignmentRepository = new EventBoothAssignmentRepository();
