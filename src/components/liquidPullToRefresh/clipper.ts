// Port of liquid_pull_to_refresh 3.0.1's lib/src/clipper.dart: CurveHillClipper, the outline of
// the coloured band that LiquidPullToRefresh draws over the top of its child, as an SVG path.
//
// While the band is shorter than `centreHeight` it is a plain rectangle. From there its bottom edge
// is a curve that sags (or, with a negative curveHeight, rises) by `curveHeight` in the middle,
// never past the band's own bottom, with a small peak of `peakHeight` × `peakWidth` at its centre.

/** CurveHillClipper.getClip for a box `width` × `height`. Runs on the UI thread. */
export function curveHillPath(
  width: number,
  height: number,
  centreHeight: number,
  curveHeight: number,
  peakHeight: number,
  peakWidth: number,
): string {
  'worklet';
  if (height >= centreHeight) {
    const curve = Math.min(curveHeight, height - centreHeight);
    const base = centreHeight + curve;
    const peak = base - peakHeight;
    const middle = width / 2;
    return (
      `M 0 0 L 0 ${centreHeight}` +
      ` Q ${width / 4} ${base} ${middle - peakWidth / 2} ${base}` +
      ` Q ${middle - peakWidth / 4} ${peak} ${middle} ${peak}` +
      ` Q ${middle + peakWidth / 4} ${peak} ${middle + peakWidth / 2} ${base}` +
      ` Q ${(width * 3) / 4} ${base} ${width} ${centreHeight}` +
      ` L ${width} 0 Z`
    );
  }
  return `M 0 0 L 0 ${height} L ${width} ${height} L ${width} 0 Z`;
}
