import { Button } from '../shared/Button';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  if (collapsed) {
    return (
      <div className="sidebar-rail__toggle">
        <Button variant="ghost" onClick={onToggle} title="Expand sidebar">
          ☰
        </Button>
      </div>
    );
  }

  return null;
}
