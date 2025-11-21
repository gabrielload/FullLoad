// src/components/ThreeD.jsx
import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";

export default function ThreeD() {
  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        camera={{ position: [6, 4, 6], fov: 45 }}
      >
        {/* Luz ambiente */}
        <ambientLight intensity={0.4} />

        {/* Luz direcional */}
        <directionalLight
          position={[5, 8, 5]}
          intensity={0.8}
          castShadow
        />

        {/* Ambiente HDR suave */}
        <Suspense fallback={null}>
          <Environment preset="city" />
        </Suspense>

        {/* Grid grande no chão */}
        <Grid
          args={[200, 200]}
          cellSize={1}
          cellThickness={0.5}
          sectionSize={5}
          sectionThickness={1}
          fadeDistance={50}
          fadeStrength={1}
        />

        {/* Controles de órbita */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}
