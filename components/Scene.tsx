import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, ToneMapping } from '@react-three/postprocessing';
import { easing } from 'maath';
import { Background } from './Background';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';
import { Topper } from './Topper';
import { TreeState } from '../types';
import { COLORS, CONFIG } from '../constants';
import * as THREE from 'three';

interface SceneProps {
  state: TreeState;
}

// Internal component to create a solid core for the tree
// Updated: Pale green, transparent, faintly glowing core
const TreeCore: React.FC<{ state: TreeState }> = ({ state }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((stateCtx, delta) => {
    if (!meshRef.current) return;
    
    // Smoothly scale the core: Full size when tree is formed, 0 when scattered
    const targetScale = state === TreeState.TREE_SHAPE ? 1 : 0;
    easing.damp3(meshRef.current.scale, [targetScale, targetScale, targetScale], 0.5, delta);
    
    // Breathing glow effect
    if (meshRef.current.material) {
        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        // Pulse between 0.1 and 0.3 intensity
        mat.emissiveIntensity = 0.2 + Math.sin(stateCtx.clock.elapsedTime * 2.0) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      {/* Slightly smaller than foliage to sit inside */}
      <coneGeometry args={[6.8, 17.5, 48]} />
      <meshStandardMaterial 
        color="#C1E1C1" 
        emissive="#C1E1C1"
        emissiveIntensity={0.2}
        transparent
        opacity={0.25}
        roughness={0.1} 
        metalness={0.1}
        side={THREE.DoubleSide} 
        depthWrite={false} // Prevent occlusion issues with transparency
      />
    </mesh>
  );
};

export const Scene: React.FC<SceneProps> = ({ state }) => {
  return (
    <Canvas
      shadows
      dpr={[1, 2]} 
      gl={{ 
        antialias: false, 
        powerPreference: "high-performance",
        alpha: false,
        stencil: false,
        depth: true
      }}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 35]} fov={45} />
      
      <Background />
      
      {/* Cinematic Lighting Setup - strictly using Palette */}
      <ambientLight intensity={0.5} color={COLORS.EMERALD_DEEP} />
      
      {/* Main Key Light - Champagne Gold */}
      <spotLight 
        position={[20, 30, 20]} 
        angle={0.25} 
        penumbra={1} 
        intensity={2500} 
        castShadow 
        color={COLORS.GOLD_CHAMPAGNE}
        shadow-mapSize={[2048, 2048]}
        decay={2.0}
        distance={100}
      />
      
      {/* Rim Light - Cool Emerald highlight */}
      <spotLight 
        position={[-20, 10, -20]} 
        angle={0.5} 
        intensity={1500} 
        color={COLORS.EMERALD_LIGHT} 
        decay={2.0}
        distance={80}
      />

      {/* Fill Light - Warm Gold under-glow */}
      <pointLight 
        position={[0, -10, 10]} 
        intensity={800} 
        color={COLORS.GOLD_METALLIC} 
        decay={2} 
        distance={40} 
      />

      <group rotation={[0, 0, 0]}>
         {/* Layer 0: Transparent Glowing Core */}
         <TreeCore state={state} />

         {/* Layer 1: The Foliage Cloud */}
         <Foliage state={state} />
         
         {/* Layer 2: The Ornaments */}
         <Ornaments state={state} />
         
         {/* Layer 3: The Topper */}
         <Topper state={state} />
      </group>

      <OrbitControls 
        enablePan={false} 
        minDistance={15} 
        maxDistance={60} 
        maxPolarAngle={Math.PI / 1.6}
        autoRotate={state === TreeState.TREE_SHAPE}
        autoRotateSpeed={0.5}
        dampingFactor={0.05}
      />

      {/* Luxury Post Processing Pipeline */}
      <EffectComposer enableNormalPass={false}>
        {/* Soft, dreamy bloom - Gold glow */}
        <Bloom 
          luminanceThreshold={0.75} 
          mipmapBlur 
          intensity={1.5} 
          radius={0.6}
          levels={8}
        />
        {/* Film Grain for texture */}
        <Noise opacity={0.05} />
        {/* Cinematic Vignette */}
        <Vignette eskil={false} offset={0.2} darkness={1.1} />
        {/* Tone Mapping for high dynamic range feeling */}
        <ToneMapping
           adaptive={true} 
           resolution={256} 
           middleGrey={0.6} 
           maxLuminance={12.0} 
           averageLuminance={1.0} 
           adaptationRate={1.0} 
        />
      </EffectComposer>
    </Canvas>
  );
};