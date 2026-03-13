'use client';

import React, { forwardRef, useImperativeHandle, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// ResizeOverlay
//
// A purely visual overlay that renders during column resize operations.
// It consists of two DOM elements:
//   1. A vertical line that follows the user's cursor, showing the new column edge.
//   2. A floating label that displays the column name (and optionally its new width).
//
// This component is intentionally rendered as a direct child of the scroll
// container (position: absolute) so that it scrolls with the table content.
// All updates are made via direct DOM manipulation (no React state) to ensure
// the overlay moves in real-time without triggering re-renders.
//
// Usage: Mount once inside BoltTable's scroll container, hold a ref to it,
// and call show() / move() / hide() imperatively during mouse events.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The imperative handle exposed by ResizeOverlay via `ref`.
 * All three methods must be called in sequence during a resize operation:
 * `show()` → `move()` (many times) → `hide()`.
 */
export interface ResizeOverlayHandle {
  /**
   * Makes the overlay visible and positions it at the start of a resize.
   * Call this on `mousedown` of the resize handle.
   *
   * @param viewportX        - The initial mouse X position in viewport coordinates (e.clientX)
   * @param columnName       - The name/title of the column being resized (shown in the label)
   * @param areaRect         - The bounding rect of the scroll container (from getBoundingClientRect)
   * @param headerLeftLocal  - The left edge of the column header in scroll-content coordinates
   * @param minSize          - The minimum allowed column width in pixels (used to clamp the line)
   * @param scrollTop        - Current vertical scroll offset of the container (scrollTop)
   * @param scrollLeft       - Current horizontal scroll offset of the container (scrollLeft)
   * @param initialLineX     - The initial X position of the vertical line in content coordinates
   */
  show: (
    viewportX: number,
    columnName: string,
    areaRect: DOMRect,
    headerLeftLocal: number,
    minSize: number,
    scrollTop: number,
    scrollLeft: number,
    initialLineX: number,
  ) => void;

  /**
   * Moves the vertical line to follow the mouse cursor during a resize drag.
   * Call this on every `mousemove` event while dragging.
   * The line is clamped to never go below the column's minimum width.
   *
   * @param viewportX - The current mouse X position in viewport coordinates (e.clientX)
   */
  move: (viewportX: number) => void;

  /**
   * Hides the overlay completely.
   * Call this on `mouseup` when the resize operation ends.
   */
  hide: () => void;
}

/**
 * Internal state cached during an active resize operation.
 * Stored in a ref so it never triggers re-renders.
 */
interface ResizeOverlayCachedState {
  /** Left edge of the column header in scroll-content coordinates */
  headerLeftLocal: number;
  /** Minimum column width — the line will never move left of (headerLeftLocal + minSize) */
  minSize: number;
  /** Left edge of the scroll container in viewport coordinates */
  areaLeft: number;
  /** Width of the scroll container in pixels */
  areaWidth: number;
  /** Measured width of the floating label element in pixels */
  labelWidth: number;
  /** Horizontal scroll offset at the time show() was called */
  scrollLeft: number;
}

/**
 * Props for the ResizeOverlay component.
 */
interface ResizeOverlayProps {
  /**
   * The accent color used for the resize line and label background.
   * Should match the `accentColor` prop passed to BoltTable for visual consistency.
   *
   * @default '#1778ff'
   *
   * @example
   * accentColor="#6366f1"
   */
  accentColor?: string;
}

/**
 * ResizeOverlay — visual feedback component for column resize operations.
 *
 * Renders a colored vertical line and a floating column-name label that track
 * the user's cursor during a column resize drag. All DOM updates are direct
 * (bypassing React state) for zero-lag, 60fps movement.
 *
 * This component is an implementation detail of BoltTable and is not intended
 * to be used standalone. It is mounted once inside the scroll container and
 * controlled imperatively via the `ResizeOverlayHandle` ref.
 *
 * @example
 * // Inside BoltTable:
 * const resizeOverlayRef = useRef<ResizeOverlayHandle>(null);
 *
 * // On resize start:
 * resizeOverlayRef.current?.show(e.clientX, 'Name', areaRect, headerLeft, 40, scrollTop, scrollLeft, initX);
 *
 * // On mouse move:
 * resizeOverlayRef.current?.move(e.clientX);
 *
 * // On mouse up:
 * resizeOverlayRef.current?.hide();
 *
 * // In JSX:
 * <ResizeOverlay ref={resizeOverlayRef} accentColor={accentColor} />
 */
const ResizeOverlay = forwardRef<ResizeOverlayHandle, ResizeOverlayProps>(
  ({ accentColor = '#1778ff' }, ref) => {
    // Direct refs to the two DOM elements — updated imperatively, never via state
    const lineRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLDivElement>(null);

    /**
     * Cached state for the active resize operation.
     * Stored in a ref so updates don't trigger re-renders.
     * Reset on every call to show().
     */
    const stateRef = useRef<ResizeOverlayCachedState>({
      headerLeftLocal: 0,
      minSize: 40,
      areaLeft: 0,
      areaWidth: 0,
      labelWidth: 80,
      scrollLeft: 0,
    });

    useImperativeHandle(
      ref,
      () => ({
        show(
          _viewportX: number,
          columnName: string,
          areaRect: DOMRect,
          headerLeftLocal: number,
          minSize: number,
          scrollTop: number,
          scrollLeft: number,
          initialLineX: number,
        ) {
          const line = lineRef.current;
          const label = labelRef.current;
          if (!line || !label) return;

          // Position the vertical line at the right edge of the column header.
          // top and height are set to cover the full scroll container height.
          line.style.top = `${scrollTop}px`;
          line.style.height = `${areaRect.height}px`;
          line.style.left = `${initialLineX - 2.5}px`;
          line.style.display = 'block';

          // Show the column name label just to the right of the line
          label.textContent = `${columnName}`;
          label.style.top = `${scrollTop + 8}px`;
          label.style.left = `${initialLineX + 6}px`;
          label.style.display = 'block';

          // Measure label width now so move() can flip it to the left when near edge
          const labelWidth = label.offsetWidth ?? 80;

          // Cache all values needed by move() — avoids re-reading the DOM on every mousemove
          stateRef.current = {
            headerLeftLocal,
            minSize,
            areaLeft: areaRect.left,
            areaWidth: areaRect.width,
            labelWidth,
            scrollLeft,
          };
        },

        move(viewportX: number) {
          const line = lineRef.current;
          const label = labelRef.current;
          if (!line || !label) return;

          const {
            headerLeftLocal,
            minSize,
            areaLeft,
            areaWidth,
            labelWidth,
            scrollLeft,
          } = stateRef.current;

          // Convert viewport X → scroll-content X, then clamp to minimum column width
          const localX = viewportX - areaLeft + scrollLeft;
          const clampedLocalX = Math.max(localX, headerLeftLocal + minSize);

          // Move the vertical line
          line.style.left = `${clampedLocalX}px`;

          // Strip any ": Xpx" suffix from a previous move (label shows name only)
          const currentText = label.textContent || '';
          const colonIndex = currentText.indexOf(':');
          if (colonIndex !== -1) {
            label.textContent = `${currentText.substring(0, colonIndex)}`;
          }

          // Flip the label to the left side of the line when it would overflow the right edge
          const labelViewportX = clampedLocalX - scrollLeft;
          const FLIP_MARGIN = 20;
          if (labelViewportX + labelWidth + FLIP_MARGIN > areaWidth) {
            label.style.left = `${clampedLocalX - labelWidth - 10}px`;
          } else {
            label.style.left = `${clampedLocalX + 6}px`;
          }
        },

        hide() {
          const line = lineRef.current;
          const label = labelRef.current;
          if (line) line.style.display = 'none';
          if (label) label.style.display = 'none';
        },
      }),
      [],
    );

    /**
     * Converts a hex color string to an rgba() string.
     * Used to create a soft glow shadow on the resize line.
     *
     * @param hex     - A 6-digit hex color e.g. '#1778ff'
     * @param opacity - Opacity value between 0 and 1
     */
    const hexToRgba = (hex: string, opacity: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    return (
      <>
        {/*
         * Vertical resize line
         * - position: absolute so it's placed within the scroll container
         * - willChange: left for GPU-composited movement (no layout thrash)
         * - pointerEvents: none so it never interferes with mouse events below it
         * - display: none by default — only shown during an active resize
         */}
        <div
          ref={lineRef}
          aria-hidden="true"
          style={{
            display: 'none',
            position: 'absolute',
            top: 0,
            height: '0px',
            left: 0,
            width: '2px',
            zIndex: 30,
            pointerEvents: 'none',
            backgroundColor: accentColor,
            boxShadow: `0 0 4px ${hexToRgba(accentColor, 0.5)}`,
            willChange: 'left',
          }}
        />

        {/*
         * Floating column name label
         * - Positioned just to the right of the resize line (or flipped left near edge)
         * - White text on accent-colored background for high contrast
         * - pointerEvents: none so it never blocks clicks
         * - display: none by default — only shown during an active resize
         */}
        <div
          ref={labelRef}
          aria-hidden="true"
          style={{
            display: 'none',
            position: 'absolute',
            top: '8px',
            left: 0,
            zIndex: 31,
            pointerEvents: 'none',
            backgroundColor: accentColor,
            color: 'white',
            fontSize: '11px',
            fontWeight: 600,
            lineHeight: 1,
            padding: '4px 8px',
            borderRadius: '5px',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            userSelect: 'none',
            willChange: 'left',
          }}
        />
      </>
    );
  },
);

ResizeOverlay.displayName = 'ResizeOverlay';

export default ResizeOverlay;