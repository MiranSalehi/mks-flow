import { forwardRef } from 'react';
import type { TaskPriority } from '../../types/messages';
import { PRIORITY_LABELS } from '../../types/messages';

interface SearchFilterProps {
  query: string;
  activePriorities: TaskPriority[];
  availableTags: string[];
  activeTags: string[];
  onQueryChange: (query: string) => void;
  onTogglePriority: (priority: TaskPriority) => void;
  onToggleTag: (tag: string) => void;
  onClear: () => void;
}

const PRIORITIES: TaskPriority[] = ['critical', 'high', 'medium', 'low'];

export const SearchFilter = forwardRef<HTMLInputElement, SearchFilterProps>(
  function SearchFilter(
    {
      query,
      activePriorities,
      availableTags,
      activeTags,
      onQueryChange,
      onTogglePriority,
      onToggleTag,
      onClear,
    },
    ref,
  ) {
  return (
    <div className="search-filter">
      <input
        ref={ref}
        className="input search-filter__input"
        placeholder="Search tasks... (press /)"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      {PRIORITIES.map((priority) => (
        <button
          key={priority}
          type="button"
          className={`chip chip--clickable ${
            activePriorities.includes(priority) ? 'chip--active' : ''
          }`}
          onClick={() => onTogglePriority(priority)}
        >
          {PRIORITY_LABELS[priority]}
        </button>
      ))}
      {availableTags.map((tag) => (
        <button
          key={tag}
          type="button"
          className={`chip chip--clickable ${
            activeTags.includes(tag) ? 'chip--active' : ''
          }`}
          onClick={() => onToggleTag(tag)}
        >
          {tag}
        </button>
      ))}
      <button type="button" className="button button--secondary" onClick={onClear}>
        Clear
      </button>
    </div>
  );
  },
);
