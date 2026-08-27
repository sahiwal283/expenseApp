import React, { useState } from 'react';
import { TradeShow, User } from '../../../../App';
import { ManifestView } from './ManifestView';
import { PackingChecklist } from './PackingChecklist';
import { ExceptionsList } from './ExceptionsList';

interface Props {
  event: TradeShow;
  user: User;
}

const MANAGE_ROLES = ['admin', 'coordinator', 'developer'];

export const BoothInventoryPanel: React.FC<Props> = ({ event, user }) => {
  const [openContainer, setOpenContainer] = useState<{ id: string; name: string } | null>(null);
  const canManage = MANAGE_ROLES.includes(user.role);

  return (
    <div className="rounded border p-4 sm:p-6 space-y-4">
      <h3 className="text-lg font-semibold">Booth inventory</h3>

      <ManifestView
        eventId={event.id}
        canManage={canManage}
        onOpenPacking={(containerId, containerName) =>
          setOpenContainer({ id: containerId, name: containerName })}
      />

      {openContainer && (
        <PackingChecklist
          containerId={openContainer.id}
          containerName={openContainer.name}
          eventId={event.id}
          onClose={() => setOpenContainer(null)}
        />
      )}

      <ExceptionsList eventId={event.id} />
    </div>
  );
};
