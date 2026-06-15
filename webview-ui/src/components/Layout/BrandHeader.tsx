interface BrandHeaderProps {
  collapsed?: boolean;
}

export function BrandHeader({ collapsed = false }: BrandHeaderProps) {
  if (collapsed) {
    return (
      <div className="brand-header brand-header--collapsed">
        <span className="brand-header__mark" aria-hidden>
          M
        </span>
      </div>
    );
  }

  return (
    <div className="brand-header">
      <span className="brand-header__mark" aria-hidden>
        M
      </span>
      <span className="brand-header__name">MKSFlow</span>
    </div>
  );
}
