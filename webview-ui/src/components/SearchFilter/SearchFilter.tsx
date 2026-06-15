import { forwardRef } from 'react';
import type { TaskPriority } from '../../types/messages';
import { PRIORITY_LABELS } from '../../types/messages';
import { Button } from '../shared/Button';

interface SearchFilterProps {
  query: string;
  activePriorities: TaskPriority[];
  availableTags: string[];
  activeTags: string[];
  onQueryChange: (query: string) => void;
  onSetPriority: (priority: TaskPriority | null) => void;
  onSetTag: (tag: string | null) => void;
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
      onSetPriority,
      onSetTag,
      onClear,
    },
    ref,
  ) {
    const activePriority = activePriorities[0];
    const activeTag = activeTags[0];
    const hasFilters =
      query.trim().length > 0 || activePriority !== undefined || activeTag !== undefined;

    return (
      <div className="search-filter">
        <input
          ref={ref}
          className="input search-filter__input"
          placeholder="Search tasks... (press /)"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <select
          className="search-filter__select"
          value={activePriority ?? ''}
          onChange={(event) =>
            onSetPriority(
              event.target.value ? (event.target.value as TaskPriority) : null,
            )
          }
          aria-label="Filter by priority"
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>

        {availableTags.length > 0 ? (
          <select
            className="search-filter__select search-filter__select--tag"
            value={activeTag ?? ''}
            onChange={(event) => onSetTag(event.target.value || null)}
            aria-label="Filter by tag"
          >
            <option value="">All tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        ) : null}

        <Button
          variant="ghost"
          className="search-filter__clear"
          onClick={onClear}
          disabled={!hasFilters}
        >
          Clear
        </Button>
      </div>
    );
  },
);
