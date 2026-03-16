'use client';

import React, { forwardRef, useImperativeHandle, useRef } from 'react';

export interface ResizeOverlayHandle {
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

  move: (viewportX: number) => void;

  hide: () => void;
}

interface ResizeOverlayCachedState {
  headerLeftLocal: number;
  minSize: number;
  areaLeft: number;
  areaWidth: number;
  labelWidth: number;
  scrollLeft: number;
}

interface ResizeOverlayProps {
  /** @default '#1778ff' */
  accentColor?: string;
}

const ResizeOverlay = forwardRef<ResizeOverlayHandle, ResizeOverlayProps>(
  ({ accentColor = '#1778ff' }, ref) => {
    const lineRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLDivElement>(null);

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

          line.style.top = `${scrollTop}px`;
          line.style.height = `${areaRect.height}px`;
          line.style.left = `${initialLineX - 2.5}px`;
          line.style.display = 'block';

          label.textContent = `${columnName}`;
          label.style.top = `${scrollTop + 8}px`;
          label.style.left = `${initialLineX + 6}px`;
          label.style.display = 'block';

          const labelWidth = label.offsetWidth ?? 80;

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

          const localX = viewportX - areaLeft + scrollLeft;
          const clampedLocalX = Math.max(localX, headerLeftLocal + minSize);

          line.style.left = `${clampedLocalX}px`;

          const currentText = label.textContent || '';
          const colonIndex = currentText.indexOf(':');
          if (colonIndex !== -1) {
            label.textContent = `${currentText.substring(0, colonIndex)}`;
          }

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

    const hexToRgba = (hex: string, opacity: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    return (
      <>
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
