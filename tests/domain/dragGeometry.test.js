// Pure drag-geometry properties.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  innerRect,
  ghostRect,
  intersects,
  dragDirection,
  shouldSwap,
  INNER_RECT_RATIO,
} from '../../js/domain/drag/geometry.js';

const arbRect = fc
  .record({
    left: fc.integer({ min: 0, max: 1000 }),
    top: fc.integer({ min: 0, max: 1000 }),
    width: fc.integer({ min: 1, max: 400 }),
    height: fc.integer({ min: 1, max: 400 }),
  })
  .map(({ left, top, width, height }) => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  }));

describe('innerRect', () => {
  it('is contained in the source rect, centered, scaled by ratio', () => {
    fc.assert(
      fc.property(arbRect, (rect) => {
        const inner = innerRect(rect);
        expect(inner.left).toBeGreaterThanOrEqual(rect.left);
        expect(inner.top).toBeGreaterThanOrEqual(rect.top);
        expect(inner.right).toBeLessThanOrEqual(rect.right);
        expect(inner.bottom).toBeLessThanOrEqual(rect.bottom);
        expect(inner.width).toBeCloseTo(rect.width * INNER_RECT_RATIO);
        expect(inner.height).toBeCloseTo(rect.height * INNER_RECT_RATIO);
        // centered: equal insets
        expect(inner.left - rect.left).toBeCloseTo(rect.right - inner.right);
      })
    );
  });
});

describe('intersects', () => {
  it('is symmetric and detects self-intersection', () => {
    fc.assert(
      fc.property(arbRect, arbRect, (a, b) => {
        expect(intersects(a, b)).toBe(intersects(b, a));
        expect(intersects(a, a)).toBe(true);
      })
    );
  });

  it('disjoint rects do not intersect', () => {
    const a = { left: 0, top: 0, right: 10, bottom: 10 };
    const b = { left: 20, top: 20, right: 30, bottom: 30 };
    expect(intersects(a, b)).toBe(false);
    // touching edges do not count (strict inequalities)
    const c = { left: 10, top: 0, right: 20, bottom: 10 };
    expect(intersects(a, c)).toBe(false);
  });
});

describe('ghostRect', () => {
  it('tracks the pointer minus the grab offset', () => {
    fc.assert(
      fc.property(
        arbRect,
        fc.integer({ min: 0, max: 2000 }),
        fc.integer({ min: 0, max: 2000 }),
        (rect, clientX, clientY) => {
          const ghost = ghostRect({
            clientX,
            clientY,
            offsetX: 5,
            offsetY: 7,
            rect,
          });
          const expected = innerRect({
            left: clientX - 5,
            top: clientY - 7,
            right: clientX - 5 + rect.width,
            bottom: clientY - 7 + rect.height,
            width: rect.width,
            height: rect.height,
          });
          expect(ghost).toEqual(expected);
        }
      )
    );
  });
});

describe('dragDirection', () => {
  it('maps axis movement to direction; stationary is null', () => {
    expect(dragDirection('column', 10, 20)).toBe('right');
    expect(dragDirection('column', 20, 10)).toBe('left');
    expect(dragDirection('card', 10, 20)).toBe('down');
    expect(dragDirection('card', 20, 10)).toBe('up');
    expect(dragDirection('card', 10, 10)).toBeNull();
  });
});

describe('shouldSwap', () => {
  const mkTarget = (rect) => ({ rect, innerRect: innerRect(rect) });

  it('cards: swaps only past the vertical overlap threshold', () => {
    const target = mkTarget({
      left: 0,
      top: 100,
      width: 100,
      height: 100,
      right: 100,
      bottom: 200,
    });
    // Big overlap -> swap
    const bigOverlap = innerRect({
      left: 0,
      top: 110,
      width: 100,
      height: 100,
      right: 100,
      bottom: 210,
    });
    expect(
      shouldSwap({
        type: 'card',
        direction: 'down',
        ghost: bigOverlap,
        target,
        dragRectWidth: 100,
      })
    ).toBe(true);
    // Barely touching -> below threshold
    const tinyOverlap = innerRect({
      left: 0,
      top: 184,
      width: 100,
      height: 100,
      right: 100,
      bottom: 284,
    });
    expect(
      shouldSwap({
        type: 'card',
        direction: 'down',
        ghost: tinyOverlap,
        target,
        dragRectWidth: 100,
      })
    ).toBe(false);
  });

  it('columns: direction gate rejects targets behind the drag direction', () => {
    const target = mkTarget({
      left: 0,
      top: 0,
      width: 100,
      height: 400,
      right: 100,
      bottom: 400,
    });
    const ghost = innerRect({
      left: 40,
      top: 0,
      width: 100,
      height: 400,
      right: 140,
      bottom: 400,
    });
    // moving right, target is to the LEFT of the ghost -> no swap
    expect(
      shouldSwap({
        type: 'column',
        direction: 'right',
        ghost,
        target,
        dragRectWidth: 100,
      })
    ).toBe(false);
    // moving left toward it -> overlap decides (here: substantial overlap)
    expect(
      shouldSwap({
        type: 'column',
        direction: 'left',
        ghost,
        target,
        dragRectWidth: 100,
      })
    ).toBe(true);
  });
});
