import { useState, useEffect } from "react";

export function useMouseParallax(sensitivity = 0.05) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [normalized, setNormalized] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setNormalized({ x, y });
      setPosition({
        x: x * sensitivity * 100,
        y: y * sensitivity * 100,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [sensitivity]);

  return { position, normalized };
}
