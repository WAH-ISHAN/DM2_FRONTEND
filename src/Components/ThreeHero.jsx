"use client";

import React, { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Float, ContactShadows, Html, useGLTF } from "@react-three/drei";

function Loader() {
  return <Html center style={{ color: "white", fontSize: 14 }}>Loading…</Html>;
}

function PiggyBank(props: any) {
  // If your GLB is Draco-compressed, uncomment next line and add decoders in /public/draco
  // useGLTF.setDecoderPath?.("/draco/");
  const { scene } = useGLTF("/public/models/piggy_bank.glb");
  return <primitive object={scene} {...props} />;
}
useGLTF.preload?.("/models/piggy_bank.glb");

function FallbackGem() {
  return (
    <mesh castShadow receiveShadow>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#60a5fa" metalness={0.1} roughness={0.25} />
    </mesh>
  );
}

function ModelAuto() {
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/models/piggy_bank.glb", { method: "HEAD" })
      .then(r => !cancelled && setExists(r.ok))
      .catch(() =>
        fetch("/models/piggy_bank.glb")
          .then(r => !cancelled && setExists(r.ok))
          .catch(() => !cancelled && setExists(false))
      );
    return () => { cancelled = true; };
  }, []);

  if (exists === null) return null; // Suspense shows Loader

  // Modern look: slightly smaller, a bit lower, and angled
  return exists ? (
    <PiggyBank scale={0.7} position={[0, -0.5, 0]} rotation={[0, Math.PI / 6, 0]} />
  ) : (
    <FallbackGem />
  );
}

export default function ThreeHero() {
  return (
    <div className="absolute inset-0">
      <Canvas
        shadows
        dpr={[1, 1]}
        camera={{ position: [2.2, 1.6, 2.6], fov: 45 }}
      >
        {/* Softer, modern lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[4, 5, 2]} intensity={1} castShadow />
        <spotLight position={[-5, 5, 5]} angle={0.3} intensity={0.8} />

        <Suspense fallback={<Loader />}>
          <Float rotationIntensity={0.20} floatIntensity={0.-4} speed={0.8}>
            <ModelAuto />
          </Float>
          <Environment preset="city" />
        </Suspense>

        <ContactShadows position={[0, -1.05, 0]} opacity={0.35} scale={7} blur={3} far={4} />
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.8} />
      </Canvas>
    </div>
  );
}