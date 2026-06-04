import { useCallback, useEffect, useRef } from 'react';
import type { ExtensionMessage, WebviewMessage } from '../types/messages';

declare function acquireVsCodeApi(): {
  postMessage(message: WebviewMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
};

let vscodeApi: ReturnType<typeof acquireVsCodeApi> | undefined;

function getVsCodeApi() {
  if (!vscodeApi && typeof acquireVsCodeApi === 'function') {
    vscodeApi = acquireVsCodeApi();
  }
  return vscodeApi;
}

export function useVSCode() {
  const postMessage = useCallback((message: WebviewMessage) => {
    getVsCodeApi()?.postMessage(message);
  }, []);

  return { postMessage };
}

export function useExtensionMessages(
  onMessage: (message: ExtensionMessage) => void,
) {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    const listener = (event: MessageEvent<ExtensionMessage>) => {
      handlerRef.current(event.data);
    };

    window.addEventListener('message', listener);
    getVsCodeApi()?.postMessage({ type: 'GET_DATA' });

    return () => window.removeEventListener('message', listener);
  }, []);
}

export function formatElapsed(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
