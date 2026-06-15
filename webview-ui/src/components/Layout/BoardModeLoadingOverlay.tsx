import { STATUSES, STATUS_LABELS, type BoardMode } from '../../types/messages';

interface BoardModeLoadingOverlayProps {
  mode: BoardMode;
}

export function BoardModeLoadingOverlay({ mode }: BoardModeLoadingOverlayProps) {
  const label = mode === 'team' ? 'Team' : 'Personal';

  return (
    <div className="board-mode-loading" role="status" aria-live="polite" aria-busy>
      <div className="board-mode-loading__panel">
        <div className="board-mode-loading__spinner" aria-hidden />
        <p className="board-mode-loading__title">Switching to {label}</p>
        <p className="board-mode-loading__subtitle">Loading your board…</p>

        <div className="board-mode-loading__board" aria-hidden>
          {STATUSES.map((status) => (
            <div key={status} className="board-mode-loading__column">
              <div className="board-mode-loading__column-head">
                <span className="board-mode-loading__shimmer" />
                <span className="board-mode-loading__column-label">
                  {STATUS_LABELS[status]}
                </span>
              </div>
              <div className="board-mode-loading__cards">
                <div className="board-mode-loading__card">
                  <span className="board-mode-loading__shimmer" />
                </div>
                <div className="board-mode-loading__card board-mode-loading__card--short">
                  <span className="board-mode-loading__shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
