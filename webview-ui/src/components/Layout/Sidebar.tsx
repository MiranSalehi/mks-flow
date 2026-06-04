import { Button } from '../shared/Button';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  if (collapsed) {
    return (
      <div style={{ padding: 8 }}>
        <Button variant="ghost" onClick={onToggle} title="Expand sidebar">
          ☰
        </Button>
      </div>
    );
  }

  return null;
}
