// Seeing and being seen: vision cones and line of sight. A watcher (guard or camera)
// sees a point when it is inside the cone's range and half-angle and no solid stands
// between them. Solids are axis-aligned rectangles; the segment test is the slab method.

/** True when the segment from (x1,y1) to (x2,y2) touches the rectangle. */
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  const axes = [
    { d: dx, min: rect.x - x1, max: rect.x + rect.width - x1 },
    { d: dy, min: rect.y - y1, max: rect.y + rect.height - y1 },
  ];
  for (const axis of axes) {
    if (axis.d === 0) {
      if (axis.min > 0 || axis.max < 0) return false;
    } else {
      let t0 = axis.min / axis.d;
      let t1 = axis.max / axis.d;
      if (t0 > t1) [t0, t1] = [t1, t0];
      tMin = Math.max(tMin, t0);
      tMax = Math.min(tMax, t1);
      if (tMin > tMax) return false;
    }
  }
  return true;
}

/** True when no solid blocks the sight line between the two points. */
export function hasLineOfSight(x1, y1, x2, y2, solids) {
  for (const solid of solids) {
    if (segmentHitsRect(x1, y1, x2, y2, solid)) return false;
  }
  return true;
}

/** Smallest absolute angle between two headings, 0..PI. */
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/**
 * True when `target` is inside the watcher's cone: within `range`, inside the half-angle
 * around `facing`, and with a clear line of sight. `sneak` shrinks the range.
 */
export function inVisionCone(wx, wy, facing, range, halfAngle, tx, ty, solids, sneak) {
  const dx = tx - wx;
  const dy = ty - wy;
  const dist = Math.hypot(dx, dy);
  const effectiveRange = sneak ? range * 0.65 : range;
  if (dist > effectiveRange) return false;
  if (dist > 1 && angleDifference(Math.atan2(dy, dx), facing) > halfAngle) return false;
  return hasLineOfSight(wx, wy, tx, ty, solids);
}
