// src/components/DashboardGrid.tsx
import React from 'react';
import Masonry from 'react-masonry-css';

/**
 * DashboardGrid component arranges its children in a responsive masonry layout.
 * It uses the react-masonry-css library to create a grid with variable column counts
 * depending on the screen size. Items marked with the 'span-2' class are rendered
 * as full-width blocks above the masonry grid.
 */
export default function DashboardGrid({ children }: { children: React.ReactNode }) {
  // Convert children to an array for manipulation
  const allChildren = React.Children.toArray(children);

  // Separate children into two groups:
  // span2Items are full-width items (marked with 'span-2' class) that should span across all columns
  // normalItems are the regular grid items displayed within the masonry layout
  const span2Items: React.ReactNode[] = [];
  const normalItems: React.ReactNode[] = [];

  allChildren.forEach((child) => {
    if (React.isValidElement(child)) {
      // Extract className from child props, casting to string to safely access it
      // This helps determine if the child should be treated as a full-width block
      const cls = (child.props as Record<string, unknown>)?.className as string || '';
      if (typeof cls === 'string' && cls.split(/\s+/).includes('span-2')) {
        span2Items.push(child); // full width block
        return;
      }
    }
    normalItems.push(child);
  });

  // Define responsive breakpoints for masonry columns:
  // - 2 columns on desktop and larger screens (width >= 768px)
  // - 1 column on mobile and smaller screens (width <= 767px)
  const breakpointColumnsObj = {
    default: 2, // >= 768px
    767: 1      // <= 767px
  };

  return (
    <>
      <style>{`
        /* Masonry base styles */
        .my-masonry-grid {
          display: -webkit-box; /* Not needed if autoprefixing */
          display: -ms-flexbox; /* Not needed if autoprefixing */
          display: flex;        /* Enable flex columns */
          margin-left: -24px;   /* gutter size offset */
          width: auto;          /* allow full width */
        }

        /* Masonry column styles */
        .my-masonry-grid_column {
          padding-left: 24px;   /* gutter size */
          background-clip: padding-box; /* keep gutter clean */
        }

        /* Space between cards inside each column */
        .my-masonry-grid_column > * {
          margin-bottom: 24px;  /* vertical gutter */
        }

        /* Full-width blocks (span-2) should align with masonry columns */
        .dashboard-fullwidth {
          width: 100%;
          margin: 0 0 24px 0; /* space below the full-width section */
        }

        /* Ensure full-width blocks don't get split */
        .dashboard-fullwidth > * {
          display: block; /* each card as block */
          width: 100%;
          margin: 0 0 24px 0;
        }
      `}</style>

      {/* Render full-width (span-2) items above the masonry grid.
          These items span the entire width and are not part of the column layout.
          Rendering them separately preserves their full-width styling and order. */}
      {span2Items.length > 0 && (
        <div className="dashboard-fullwidth">
          {span2Items}
        </div>
      )}

      {/* Render the masonry grid with normal items.
          This component handles the responsive column layout and spacing. */}
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="my-masonry-grid"
        columnClassName="my-masonry-grid_column"
      >
        {normalItems}
      </Masonry>
    </>
  );
}