import type { BoardMode, CloudSyncStatus, CloudUser } from '../../types/messages';
import { Button } from '../shared/Button';

interface TeamModeBarProps {
  boardMode: BoardMode;
  boardModeSwitching?: boolean;
  cloudAuthenticated: boolean;
  cloudUser: CloudUser | null;
  cloudLastSyncAt: string | null;
  syncStatus: CloudSyncStatus;
  syncMessage: string | null;
  onSetMode: (mode: BoardMode) => void;
  onSyncNow: () => void;
  onLogout: () => void;
  onOpenWebApp?: () => void;
}

function formatSyncLabel(
  syncStatus: CloudSyncStatus,
  syncMessage: string | null,
  lastSyncAt: string | null,
): string {
  if (syncStatus === 'syncing') {
    return 'Syncing…';
  }
  if (syncStatus === 'offline') {
    return syncMessage ?? 'Offline — showing cached tasks';
  }
  if (syncStatus === 'error') {
    return syncMessage ?? 'Sync error';
  }
  if (lastSyncAt) {
    return `Synced ${new Date(lastSyncAt).toLocaleTimeString()}`;
  }
  return 'Not synced yet';
}

export function TeamModeBar({
  boardMode,
  boardModeSwitching = false,
  cloudAuthenticated,
  cloudUser,
  cloudLastSyncAt,
  syncStatus,
  syncMessage,
  onSetMode,
  onSyncNow,
  onLogout,
  onOpenWebApp,
}: TeamModeBarProps) {
  return (
    <div className="team-mode-bar">
      <div className="team-mode-bar__toggle" role="tablist" aria-label="Board mode">
        <Button
          variant={boardMode === 'personal' ? 'primary' : 'secondary'}
          onClick={() => onSetMode('personal')}
          aria-pressed={boardMode === 'personal'}
          disabled={boardModeSwitching}
        >
          Personal
        </Button>
        <Button
          variant={boardMode === 'team' ? 'primary' : 'secondary'}
          onClick={() => onSetMode('team')}
          aria-pressed={boardMode === 'team'}
          disabled={boardModeSwitching}
        >
          Team
        </Button>
      </div>

      {boardMode === 'team' ? (
        <div className="team-mode-bar__cloud">
          {cloudAuthenticated && cloudUser ? (
            <span className="team-mode-bar__user">{cloudUser.name}</span>
          ) : null}
          <span
            className={`team-mode-bar__status team-mode-bar__status--${syncStatus}`}
          >
            {formatSyncLabel(syncStatus, syncMessage, cloudLastSyncAt)}
          </span>
          {cloudAuthenticated ? (
            <>
              {onOpenWebApp ? (
                <Button variant="ghost" onClick={onOpenWebApp}>
                  Open web
                </Button>
              ) : null}
              <Button variant="secondary" onClick={onSyncNow}>
                Sync now
              </Button>
              <Button variant="ghost" onClick={onLogout}>
                Sign out
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
