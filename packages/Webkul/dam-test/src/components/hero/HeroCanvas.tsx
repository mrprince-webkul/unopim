import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Read the live accent (`--primary`, stored as "H S% L%") so the object matches
// the active theme's paper/graphite palette.
function readAccent(): string {
  if (typeof window === "undefined") return "#6d5ef6";
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  if (!raw) return "#6d5ef6";
  return `hsl(${raw.replace(/\s+/g, ", ")})`;
}

function Knot({ color }: { color: string }) {
  const group = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += delta * 0.28;
    g.rotation.x += delta * 0.12;
    // Ease toward the pointer for parallax life.
    pointer.current.x += (state.pointer.x * 0.5 - pointer.current.x) * 0.04;
    pointer.current.y += (state.pointer.y * 0.5 - pointer.current.y) * 0.04;
    g.position.x = 2.7 + pointer.current.x;
    g.position.y = pointer.current.y + Math.sin(state.clock.elapsedTime * 0.6) * 0.18;
  });

  return (
    <group ref={group} position={[2.7, 0, 0]}>
      <mesh>
        <torusKnotGeometry args={[1.25, 0.36, 180, 26]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.7} />
      </mesh>
      <mesh scale={0.5} rotation={[0.4, 0.2, 0]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

function Dust({ color }: { color: string }) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const count = 260;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={0.035} color={color} transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}

export default function HeroCanvas() {
  const color = useMemo(readAccent, []);
  return (
    <Canvas
      className="!absolute inset-0"
      camera={{ position: [0, 0, 6], fov: 55 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <Dust color={color} />
      <Knot color={color} />
    </Canvas>
  );
}
