import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useMemo, useRef, useState } from 'react'

// Intersection curve: substitute cone surface into the plane equation.
// Upper nappe (d > 0): (r·cosφ, r, r·sinφ) → r = d/(1 − e·sinφ)
// Lower nappe (d < 0): (ρ·cosφ, −ρ, ρ·sinφ) → ρ = |d|/(1 + e·sinφ)
// Unified: r = |d| / (1 − dSign·e·sinφ),  y = dSign·r
function IntersectionCurve({ e, d }: { e: number; d: number }) {
  const primitives = useMemo(() => {
    const eps = 1e-3;
    const absD = Math.abs(d);
    const yellow = '#ffff00';
    const line = (pts: THREE.Vector3[]) => {
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: yellow }));
    };

    // Degenerate: d = 0, plane passes through apex — render by conic type
    if (absD < 1e-6) {
      if (e < eps) {
        // Point: apex only
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.03, 8, 8),
          new THREE.MeshBasicMaterial({ color: yellow }),
        );
        return [mesh];
      }
      if (Math.abs(e - 1) < eps) {
        // Single generator: direction (0,1,1), y ∈ [−1, 1]
        return [line([new THREE.Vector3(0, -1, -1), new THREE.Vector3(0, 1, 1)])];
      }
      if (e > 1 + eps) {
        // Two generators: x = ±y·√(e²−1)/e, z = y/e, y ∈ [−1, 1]
        const sx = Math.sqrt(e * e - 1) / e;
        const sz = 1 / e;
        return [
          line([new THREE.Vector3(-sx, -1, -sz), new THREE.Vector3(sx, 1, sz)]),
          line([new THREE.Vector3(sx, -1, -sz), new THREE.Vector3(-sx, 1, sz)]),
        ];
      }
      return [];
    }

    const N = 800;
    const maxR = 1.1; // clip to visible cone geometry (nappes span y ∈ [−1, 1])
    const segments: THREE.Vector3[][] = [];
    let seg: THREE.Vector3[] = [];

    const flush = () => {
      if (seg.length >= 2) segments.push(seg);
      seg = [];
    };

    const dSign = d >= 0 ? 1 : -1;
    for (let i = 0; i <= N; i++) {
      const phi = (i / N) * 2 * Math.PI;
      const r = absD / (1 - dSign * e * Math.sin(phi));
      if (!isFinite(r) || Math.abs(r) > maxR) {
        flush();
      } else {
        seg.push(new THREE.Vector3(r * Math.cos(phi), dSign * r, r * Math.sin(phi)));
      }
    }
    flush();

    return segments.map(pts => line(pts));
  }, [e, d]);

  return <>{primitives.map((obj, i) => <primitive key={i} object={obj} />)}</>;
}

function ConeScene({ eccentricity, d }: { eccentricity: number, d: number }) {
  // atan(e): 0→0°, 1→45°, ∞→90°, naturally handles all eccentricities without clamping.
  // PlaneGeometry is vertical by default; subtract from π/2 so e=0 is horizontal (circle).
  const planeTilt = Math.PI / 2 - Math.atan(eccentricity)

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 3]} intensity={1.2} />

      {/* Upper nappe: tip at origin, opens toward +Y */}
      <mesh position={[0, 0.5, 0]} rotation={[Math.PI, 0, 0]} renderOrder={0}>
        <coneGeometry args={[1, 1, 64, 1, true]} />
        <meshStandardMaterial color="#4499ff" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.5, 0]} rotation={[Math.PI, 0, 0]} renderOrder={0}>
        <coneGeometry args={[1, 1, 32, 1, true]} />
        <meshBasicMaterial color="#4499ff" wireframe transparent opacity={0.5} />
      </mesh>

      {/* Lower nappe: tip at origin, opens toward -Y */}
      <mesh position={[0, -0.5, 0]} renderOrder={0}>
        <coneGeometry args={[1, 1, 64, 1, true]} />
        <meshStandardMaterial color="#4499ff" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.5, 0]} renderOrder={0}>
        <coneGeometry args={[1, 1, 32, 1, true]} />
        <meshBasicMaterial color="#4499ff" wireframe transparent opacity={0.5} />
      </mesh>

      {/* Cutting plane — positioned at d along axis */}
      {/* renderOrder={1}: always renders after cones (fixes d=±0.5 sort-order flip) */}
      {/* depthWrite={false}: depth-tested against cone but doesn't block it */}
      <mesh position={[0, d, 0]} rotation={[planeTilt, 0, 0]} renderOrder={1}>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial color="#ff7700" transparent opacity={0.35} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Intersection curve — yellow highlight */}
      <IntersectionCurve e={eccentricity} d={d} />

      <OrbitControls />
    </>
  )
}

export function ConeVis({ eccentricity, d }: { eccentricity: number, d: number }) {
  const [size, setSize] = useState({ w: 250, h: 250 });
  const dragStart = useRef<{ mx: number; my: number; w: number; h: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };

    const onMove = (me: MouseEvent) => {
      const { mx, my, w, h } = dragStart.current!;
      setSize({
        w: Math.max(150, w + me.clientX - mx),
        h: Math.max(150, h + me.clientY - my),
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      dragStart.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div style={{
      position: 'fixed', top: 16, left: 16,
      width: size.w, height: size.h, borderRadius: 10,
      overflow: 'hidden', background: '#0d1117',
      border: '1px solid #30363d',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      zIndex: 10,
    }}>
      <Canvas camera={{ position: [2.2, 1.2, 2.2], fov: 45 }}>
        <ConeScene eccentricity={eccentricity} d={d} />
      </Canvas>
      {/* Resize handle — bottom-right corner */}
      <div
        onMouseDown={onMouseDown}
        style={{
          position: 'absolute', bottom: 4, right: 4,
          width: 14, height: 14, cursor: 'nwse-resize',
          background: 'linear-gradient(135deg, transparent 40%, #8b949e 40%, #8b949e 60%, transparent 60%, transparent 75%, #8b949e 75%)',
          opacity: 0.6,
        }}
      />
    </div>
  )
}
