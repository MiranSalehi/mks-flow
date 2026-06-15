import EasyMDE from 'easymde';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import 'easymde/dist/easymde.min.css';
import '@fortawesome/fontawesome-free/css/fontawesome.min.css';
import '@fortawesome/fontawesome-free/css/solid.min.css';

export interface TaskDescriptionEditorHandle {
  getValue: () => string;
  refresh: () => void;
}

interface TaskDescriptionEditorProps {
  taskId: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onMediaPaste?: (event: ClipboardEvent) => boolean | void;
}

const TOOLBAR = [
  'bold',
  'italic',
  'strikethrough',
  'heading',
  '|',
  'quote',
  'unordered-list',
  'ordered-list',
  '|',
  'link',
  'code',
  '|',
  'undo',
  'redo',
] as const;

export const TaskDescriptionEditor = forwardRef<
  TaskDescriptionEditorHandle,
  TaskDescriptionEditorProps
>(function TaskDescriptionEditor(
  { taskId, value, placeholder, onChange, onMediaPaste },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<EasyMDE | null>(null);
  const onChangeRef = useRef(onChange);
  const onMediaPasteRef = useRef(onMediaPaste);
  const valueRef = useRef(value);

  onChangeRef.current = onChange;
  onMediaPasteRef.current = onMediaPaste;
  valueRef.current = value;

  useImperativeHandle(ref, () => ({
    getValue: () => editorRef.current?.value() ?? valueRef.current,
    refresh: () => {
      requestAnimationFrame(() => {
        editorRef.current?.codemirror?.refresh();
      });
    },
  }));

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const editor = new EasyMDE({
      element: textarea,
      autofocus: false,
      spellChecker: false,
      autoDownloadFontAwesome: false,
      placeholder,
      minHeight: '120px',
      maxHeight: '240px',
      status: ['lines', 'cursor'],
      toolbar: [...TOOLBAR],
    });

    editor.value(valueRef.current);

    const handleChange = () => {
      onChangeRef.current(editor.value());
    };

    editor.codemirror.on('change', handleChange);
    editor.codemirror.on('paste', (_cm, event) => {
      if (onMediaPasteRef.current?.(event)) {
        event.preventDefault();
      }
    });
    editor.codemirror.setOption('lineWrapping', true);
    editor.codemirror.setOption('lineNumbers', false);
    editor.codemirror.setOption('gutters', []);

    editorRef.current = editor;

    requestAnimationFrame(() => {
      editor.codemirror.refresh();
    });

    return () => {
      editor.codemirror.off('change', handleChange);
      editor.toTextArea();
      editorRef.current = null;
    };
  }, [placeholder, taskId]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      editorRef.current?.codemirror?.refresh();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [taskId]);

  return (
    <div ref={containerRef} className="task-description-editor">
      <textarea ref={textareaRef} defaultValue={value} />
    </div>
  );
});
