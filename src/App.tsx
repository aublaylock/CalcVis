import { Mafs, Plot, Coordinates, Line, useMovablePoint, Point, Text } from "mafs";
import "mafs/core.css";
import "./App.css";
import { ConeVis } from "./ConeVis";
import { InfoPanel } from "./InfoPanel";

export default function App() {
  const eccentricityPt = useMovablePoint([0, 0], {
    constrain: ([x]) => [Math.abs(x-1) < 0.05 ? 1 : Math.max(x, 0), 0],
  });
  const e = eccentricityPt.x;

  // dPt controls d, the semi-latus rectum (= ConeVis plane height)
  const dPt = useMovablePoint([0, 1], {
    constrain: ([, y]) => [0, Math.abs(y) < 0.05 ? 0 : y],
  });
  const d = dPt.y;

  const eps = 1e-3;

  // Mirror IntersectionCurve from ConeVis: r = |d| / (1 − dSign·e·sin φ)
  // Project onto the cutting plane: u = r·cosφ, v = r·sinφ·sqrt(1+e²)
  // (the sqrt(1+e²) factor = 1/sin(planeTilt) compensates the plane tilt)
  const dSign = d >= 0 ? 1 : -1;
  const absD = Math.abs(d);
  const sq = Math.sqrt(1 + e * e);  // = 1/sin(planeTilt)
  const plotXY = (phi: number): [number, number] => {
    const r = absD / (1 - dSign * e * Math.sin(phi));
    if (!isFinite(r) || Math.abs(r) > 100) return [NaN, NaN];
    return [r * Math.cos(phi), r * Math.sin(phi) * sq];
  };

  // d=0: degenerate conics — render as lines/point instead of parametric curve.
  // Asymptote angles phi₀ satisfy 1 − dSign·e·sin(phi₀) = 0 → tan(phi₀) = 1/sqrt(e²−1)
  // Projected slope in plane coords = sq·tan(phi₀) = sq/sqrt(e²−1)
  const isDegenerate = absD == 0;
  const asymSlope = isDegenerate && e > 1 + eps ? sq / Math.sqrt(e * e - 1) : 0;

  // For e=1 (parabola), the polar equation has a singularity at φ = π/2 (dSign>0) or
  // 3π/2 (dSign<0). Shift the domain to start just past the singularity so the full
  // parabola is sampled without hitting the undefined point.
  const isParabola = Math.abs(e - 1) < eps;
  const singPhi = isParabola ? (dSign > 0 ? Math.PI / 2 : 3 * Math.PI / 2) : 0;
  const domain: [number, number] = isParabola
    ? [singPhi + 0.01, singPhi + 2 * Math.PI - 0.01]
    : [0, 2 * Math.PI];

  // For hyperbola (e > 1): split into two separate Plot.Parametric calls, one per branch,
  // each with a domain that never crosses a singularity. This prevents the adaptive sampler
  // from bridging across the asymptote gap and drawing spurious lines.
  // Asymptotes at sin(phi) = 1/(dSign·e): for dSign=1, phi0=arcsin(1/e), phi1=π−arcsin(1/e);
  // for dSign=−1, phi0=π+arcsin(1/e), phi1=2π−arcsin(1/e).
  const isHyperbola = !isDegenerate && e > 1 + eps;
  const hyperTheta = isHyperbola ? Math.asin(1 / e) : 0;  // ∈ (0, π/2)
  const hyperPhi0 = dSign > 0 ? hyperTheta : Math.PI + hyperTheta;
  const hyperPhi1 = dSign > 0 ? Math.PI - hyperTheta : 2 * Math.PI - hyperTheta;
  const hyperBranch1: [number, number] = [hyperPhi1 + 1e-4, hyperPhi0 + 2 * Math.PI - 1e-4];
  const hyperBranch2: [number, number] = [hyperPhi0 + 1e-4, hyperPhi1 - 1e-4];

  const minSamplingDepth = Math.min(14, Math.max(8, Math.round(8 - Math.log2(Math.min(absD, 1)))));

  // Foci in plane coordinates (Dandelin sphere construction).
  // F1 is always toward the apex; F2 toward the far end. Negated for d<0 (reflected conic).
  const focus1_v = e > eps ? -dSign * absD * e / (Math.SQRT2 + sq) : null;
  const focus2_v = e > eps && Math.abs(e - 1) > eps ? dSign * absD * e / (Math.SQRT2 - sq) : null;

  return (
    <div className="diagram">
      <ConeVis eccentricity={e} d={d} />
      <InfoPanel e={e} d={d} focus1_v={focus1_v} focus2_v={focus2_v} />
      <Mafs viewBox={{ x: [-2, 2], y: [-2, 2] }} height={window.innerHeight} zoom={{ min: 0.1, max: 2 }}>
        <Coordinates.Cartesian />
        {isDegenerate ? (
          <>
            {e < 1 - eps && <Point x={0} y={0} />}
            {Math.abs(e - 1) < eps && <Line.ThroughPoints point1={[0, -1]} point2={[0, 1]} />}
            {e > 1 + eps && <>
              <Line.PointSlope point={[0, 0]} slope={asymSlope} />
              <Line.PointSlope point={[0, 0]} slope={-asymSlope} />
            </>}
          </>
        ) : isHyperbola ? (
          <>
            <Plot.Parametric domain={hyperBranch1} xy={plotXY} minSamplingDepth={minSamplingDepth} />
            <Plot.Parametric domain={hyperBranch2} xy={plotXY} minSamplingDepth={minSamplingDepth} />
          </>
        ) : (
          <Plot.Parametric domain={domain} xy={plotXY} minSamplingDepth={minSamplingDepth} />
        )}
        {dPt.element}
        <Text x={0} y={d} attach="e" attachDistance={15}>d</Text>
        {!isDegenerate && focus1_v !== null && <>
          <Point x={0} y={focus1_v} />
          <Text x={0} y={focus1_v} attach="e" attachDistance={15}>F₁</Text>
        </>}
        {!isDegenerate && focus2_v !== null && <>
          <Point x={0} y={focus2_v} />
          <Text x={0} y={focus2_v} attach="e" attachDistance={15}>F₂</Text>
        </>}
        {eccentricityPt.element}
        <Text x={e} y={-0.09} attach="n" attachDistance={15}>e</Text>
      </Mafs>
    </div>
  );
}
