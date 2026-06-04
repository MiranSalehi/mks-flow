import { useEffect, useRef } from 'react';

interface BoardShortcutHandlers {
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  onFocusSearch: () => void;
  onNewTask: () => void;
  onCloseDetail: () => void;
}

/**
 * Keyboard shortcuts for fast board navigation.
 */
export function useBoardShortcuts(handlers: BoardShortcutHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      const isTyping =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable;

      if (event.key === 'Escape' && handlersRef.current.selectedTaskId) {
        event.preventDefault();
        handlersRef.current.onCloseDetail();
        return;
      }

      if (isTyping) {
        return;
      }

      if (event.key === '/' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        handlersRef.current.onFocusSearch();
        return;
      }

      if (
        event.key === 'n' &&
        !event.metaKey &&
        !event.ctrlKey &&
        handlersRef.current.selectedProjectId
      ) {
        event.preventDefault();
        handlersRef.current.onNewTask();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
