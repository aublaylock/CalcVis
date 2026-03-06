const PANEL: React.CSSProperties = {
  position: 'fixed', top: 16, right: 16,
  background: '#0d1117',
  border: '1px solid #30363d',
  borderRadius: 10,
  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
  color: '#e6edf3',
  fontFamily: 'monospace',
  fontSize: 13,
  padding: '12px 16px',
  minWidth: 200,
  zIndex: 10,
  userSelect: 'none',
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginTop: 5 }}>
      <span style={{ color: '#8b949e' }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: '1px solid #30363d', margin: '8px 0' }} />;
}

function fmt(n: number) {
  return n.toFixed(3);
}

function fmtPt(x: number, y: number) {
  return `(${fmt(x)}, ${fmt(y)})`;
}

interface InfoPanelProps {
  e: number;
  d: number;
  focus1_v: number | null;
  focus2_v: number | null;
}

export function InfoPanel({ e, d, focus1_v, focus2_v }: InfoPanelProps) {
  const eps = 1e-3;
  const absD = Math.abs(d);
  const sq = Math.sqrt(1 + e * e);

  const isDegenerate  = absD == 0;
  const isCircle      = !isDegenerate && e == 0;
  const isParabola    = !isDegenerate && e == 1;
  const isEllipse     = !isDegenerate && e > 0 && e < 1;
  const isHyperbola   = !isDegenerate && e > 1;

  const isDegPoint    = isDegenerate && e < 1;
  const isDegLine     = isDegenerate && e == 1;
  const isDegTwoLines = isDegenerate && e > 1;

  const type = isCircle     ? 'Circle'
    : isParabola    ? 'Parabola'
    : isEllipse     ? 'Ellipse'
    : isHyperbola   ? 'Hyperbola'
    : isDegPoint    ? 'Point'
    : isDegLine     ? 'Line'
    : isDegTwoLines ? 'Two Lines'
    : 'Degenerate';

  // Ellipse semi-axes (abstract polar form)
  const ea = isEllipse ? absD / (1 - e * e) : 0;
  const eb = isEllipse ? absD / Math.sqrt(1 - e * e) : 0;

  // Asymptote slope in (u,v) display space — same formula as App.tsx
  const asymSlope = (isHyperbola || isDegTwoLines) && e > 1
    ? sq / Math.sqrt(e * e - 1)
    : 0;

  return (
    <div style={PANEL}>
      <div style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 4 }}>{type}</div>
      <Divider />

      {isCircle && <>
        <Row label="r" value={fmt(absD)} />
      </>}

      {isEllipse && <>
        <Row label="a (semi-major)" value={fmt(ea)} />
        <Row label="b (semi-minor)" value={fmt(eb)} />
        <Divider />
        {focus1_v !== null && <Row label="Focus₁" value={fmtPt(0, focus1_v)} />}
        {focus2_v !== null && <Row label="Focus₂" value={fmtPt(0, focus2_v)} />}
      </>}

      {isParabola && <>
        <Row label="Vertex" value={fmtPt(0, -d / Math.SQRT2)} />
        {focus1_v !== null && <Row label="Focus" value={fmtPt(0, focus1_v)} />}
      </>}

      {isHyperbola && <>
        {focus1_v !== null && <Row label="Focus₁" value={fmtPt(0, focus1_v)} />}
        {focus2_v !== null && <Row label="Focus₂" value={fmtPt(0, focus2_v)} />}
        <Divider />
        <Row label="Asymptote slopes" value={`±${fmt(asymSlope)}`} />
      </>}

      {isDegTwoLines && <>
        <Row label="Slopes" value={`±${fmt(asymSlope)}`} />
      </>}

      <Row label="Eccentricity" value={fmt(e)} />
      <Row label="Plane Height" value={fmt(d)} />
    </div>
  );
}
