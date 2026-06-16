import { Button } from '../shared/Button';

interface CloudTaskPanelProps {
  pullRequestUrl?: string | null;
  agentWorkflowStatus?: string | null;
  currentIteration?: number | null;
  onOpenInCloud: () => void;
}

function formatAgentStatus(status: string | null | undefined): string | null {
  if (!status) {
    return null;
  }

  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function CloudTaskPanel({
  pullRequestUrl,
  agentWorkflowStatus,
  currentIteration,
  onOpenInCloud,
}: CloudTaskPanelProps) {
  const agentLabel = formatAgentStatus(agentWorkflowStatus);

  return (
    <div className="cloud-task-panel">
      <p className="cloud-task-panel__lead">
        <strong>Team task.</strong> Use <em>Send to AI</em> for local Cursor chat.
        Cloud agent runs, diff review, and PR workflow live in the web app.
      </p>
      <div className="cloud-task-panel__meta">
        {agentLabel ? (
          <span className="cloud-task-panel__badge">{agentLabel}</span>
        ) : null}
        {currentIteration && currentIteration > 0 ? (
          <span className="cloud-task-panel__badge cloud-task-panel__badge--muted">
            Iteration {currentIteration}
          </span>
        ) : null}
      </div>
      <div className="cloud-task-panel__actions">
        <Button variant="secondary" onClick={onOpenInCloud}>
          Open in cloud
        </Button>
        {pullRequestUrl ? (
          <a
            className="cloud-task-panel__link"
            href={pullRequestUrl}
            target="_blank"
            rel="noreferrer"
          >
            View PR
          </a>
        ) : null}
      </div>
    </div>
  );
}
