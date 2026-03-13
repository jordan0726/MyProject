// -----------------------------------------------------------------------------
// CollapsibleCard component
// A simple card with a clickable header that expands/collapses its body content.
// Focus:
//   - Accessibility: proper aria-expanded, aria-controls, region role.
//   - Testability: opt-in test IDs, state exposure, and animation skip flag.
//   - Stability: effect guards and cleanup to avoid flaky tests.
// -----------------------------------------------------------------------------

import { useState, useRef, useEffect, useId } from 'react';
import Icon from '@mdi/react';
import { mdiChevronDown } from '@mdi/js';

/**
 * Public props for CollapsibleCard.
 * Notes:
 * - `collapsible=false` disables the toggle behavior but keeps the header visuals.
 * - `defaultExpanded` controls the initial expanded state on first mount.
 * - Test helpers are optional and safe in production (no behavior changes if omitted).
 */
type CollapsibleCardProps = {
  title: string;            // Text shown in the header
  icon?: React.ReactNode;   // Optional icon displayed before the title in the header
  extra?: React.ReactNode;  // Optional content shown on the right side of the header
  collapsible?: boolean;    // If true, the card can be expanded or collapsed by clicking the header
  defaultExpanded?: boolean;// Whether the card starts expanded (true) or collapsed (false)
  children: React.ReactNode;// The content inside the collapsible body section
  // ---- Optional helpers for tests & a11y (no-op in production) ----
  onToggle?: (expanded: boolean) => void;      // Fire when expanded state toggles (useful for assertions)
  rootTestId?: string;                         // data-testid on root wrapper
  headerTestId?: string;                       // data-testid on header button (toggle target)
  bodyTestId?: string;                         // data-testid on collapsible body container
  chevronTestId?: string;                      // data-testid on chevron wrapper (rotates on expand/collapse)
  testNoAnimation?: boolean;                   // Skip transitions to stabilize tests (sets maxHeight immediately)
};

/**
 * CollapsibleCard
 * - Renders a header (button) and a collapsible body region.
 * - a11y contract: header exposes `aria-expanded` and `aria-controls`; body uses `role="region"` and a matching `id`.
 * - When `testNoAnimation` is true, the body switches maxHeight without transition for deterministic unit tests.
 */
export default function CollapsibleCard({
  title,
  icon,
  extra,
  collapsible = true,
  defaultExpanded = true,
  children,
  onToggle,
  rootTestId,
  headerTestId,
  bodyTestId,
  chevronTestId,
  testNoAnimation,
}: CollapsibleCardProps) {
  // State: expanded/collapsed flag for the body section
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  // Ref: body container (read scrollHeight; drive maxHeight animation)
  const contentElementRef = useRef<HTMLDivElement | null>(null);

  // Stable DOM id so the header can point to the body via aria-controls (improves screen reader UX)
  const bodyId = useId(); // Link header aria-controls to body for a11y

  // Animation effect: run on `isExpanded` changes to drive the maxHeight transition.
  // - When `testNoAnimation` is true, we bail out early and set final styles immediately (test stability).
  // - Otherwise we animate between heights and clean up transition listeners to prevent leaks.
  useEffect(() => {
    const bodyElement = contentElementRef.current!;
    // Test path: avoid transition timing/RAF dependencies in JSDOM
    if (testNoAnimation) {
      bodyElement.style.maxHeight = isExpanded ? 'none' : '0px'; // Immediate state
      return;
    }

    const contentHeight = bodyElement.scrollHeight; // full height of the content

    // Expand branch: transition up to contentHeight, then uncap maxHeight ('none')
    if (isExpanded) {
      // Expand: animate to full height, then remove maxHeight cap
      const onEnd = () => {
        bodyElement.style.maxHeight = 'none';
        bodyElement.removeEventListener('transitionend', onEnd);
      };
      bodyElement.addEventListener('transitionend', onEnd);
      bodyElement.style.maxHeight = contentHeight + 'px';
      return () => bodyElement.removeEventListener('transitionend', onEnd);
    } else {
      // Collapse branch: ensure we start at current height, then transition down to 0px
      // Collapse: set current height first then transition to 0
      bodyElement.style.maxHeight = contentHeight + 'px';
      requestAnimationFrame(() => {
        bodyElement.style.maxHeight = '0px';
      });
    }
  }, [isExpanded, testNoAnimation]);

  return (
    <div data-testid={rootTestId} data-state-expanded={isExpanded ? 'true' : 'false'} style={{ background: '#fff', borderRadius: 8, border: '1px solid #e6e9ef', overflow: 'hidden' }}>
      {/* Header: acts as the toggle. Exposes aria-expanded and links to body via aria-controls. */}
      <button
        type="button"
        onClick={collapsible ? () => { const next = !isExpanded; setIsExpanded(next); onToggle?.(next); } : undefined} // Fire callback for tests
        aria-expanded={isExpanded}
        aria-controls={bodyId}
        data-testid={headerTestId}
        style={{
          width: '100%',
          background: '#FBE1d7',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          border: 0,
          cursor: collapsible ? 'pointer' : 'default',
        }}
      >
        {/* Left: optional icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon}
          <strong>{title}</strong>
        </div>
        {/* Right: optional extra + chevron (rotates on expand) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {extra}
          {collapsible && (
            <span data-testid={chevronTestId} style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 200ms' }}> {/* Rotate to indicate expanded/collapsed */}
              <Icon path={mdiChevronDown} size={1} color="#444" />
            </span>
          )}
        </div>
      </button>
      {/* Collapsible body: content area that expands/collapses. In tests, `testNoAnimation` applies immediate styles. */}
      <div
        id={bodyId}
        ref={contentElementRef}
        role="region" // A11y landmark for the collapsible content
        data-testid={bodyTestId}
        style={{
          maxHeight: testNoAnimation ? (isExpanded ? 'none' : '0px') : 0, // Immediate stable initial state in tests
          overflow: 'hidden',
          transition: 'max-height 220ms ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}