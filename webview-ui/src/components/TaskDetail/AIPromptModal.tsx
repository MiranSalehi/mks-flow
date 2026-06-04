import { useState } from 'react';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';

export interface AIContextReadyPayload {
  taskId: string;
  relativePath: string;
  contextFilePath: string;
  chatPrompt: string;
  markdown?: string;
}

interface AIPromptModalProps {
  context: AIContextReadyPayload;
  onClose: () => void;
  onOpenFile: () => void;
}

export function AIPromptModal({
  context,
  onClose,
  onOpenFile,
}: AIPromptModalProps) {
  const [copied, setCopied] = useState(false);
  const [showFullContext, setShowFullContext] = useState(false);

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(`@${context.relativePath}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal
      title="Sent to Cursor"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={copyReference}>
            {copied ? 'Copied!' : 'Copy @reference'}
          </Button>
          <Button variant="secondary" onClick={onOpenFile}>
            Open file
          </Button>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <p className="ai-context-modal__lead">
        Task context was written and added to your current Composer chat. Press
        Enter when you are ready.
      </p>
      <div className="ai-context-modal__path">
        <span className="field-label">Context file</span>
        <code>{context.relativePath}</code>
      </div>
      <div className="ai-context-modal__path">
        <span className="field-label">Chat prompt</span>
        <pre className="prompt-block">{context.chatPrompt}</pre>
      </div>
      {context.markdown ? (
        <>
          <Button
            variant="ghost"
            onClick={() => setShowFullContext((value) => !value)}
          >
            {showFullContext ? 'Hide full context' : 'Show full context'}
          </Button>
          {showFullContext ? (
            <pre className="prompt-block">{context.markdown}</pre>
          ) : null}
        </>
      ) : null}
    </Modal>
  );
}

/** Legacy clipboard-only modal. */
interface LegacyAIPromptModalProps {
  prompt: string;
  onClose: () => void;
}

export function LegacyAIPromptModal({
  prompt,
  onClose,
}: LegacyAIPromptModalProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal
      title="AI Prompt"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={copy}>
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <pre className="prompt-block">{prompt}</pre>
    </Modal>
  );
}
