import React from 'react';

export function CardSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-block skeleton-image" />
      <div className="skeleton-block skeleton-line large" />
      <div className="skeleton-block skeleton-line medium" />
      <div className="skeleton-chip-row">
        <span className="skeleton-block skeleton-chip" />
        <span className="skeleton-block skeleton-chip" />
        <span className="skeleton-block skeleton-chip" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }) {
  return (
    <div className="property-grid">
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}
