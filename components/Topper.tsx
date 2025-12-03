import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Float, Text, Sparkles } from '@react-three/drei';
import { easing } from 'maath';
import { TreeState } from '../types';
import { CONFIG, COLORS } from '../constants';

interface TopperProps {
  state: TreeState;
}

export const Topper: React.FC<TopperProps> = ({ state }) => {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  // Generate 5-Pointed Star Shape
  const starGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 1.2;
    const innerRadius = 0.5;
    const points = 5;
    
    // Rotate -PI/2 to make the star point upwards
    const offsetAngle = -Math.PI / 2;

    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points + offsetAngle;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings = {
      depth: 0.2, // Thickness
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.05,
      bevelSegments: 3
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.center(); // Center the geometry for rotation
    return geom;
  }, []);

  useFrame((stateCtx, delta) => {
    if (!groupRef.current) return;
    
    // Transition scale
    const targetScale = state === TreeState.TREE_SHAPE ? 1 : 0;
    easing.damp3(groupRef.current.scale, [targetScale, targetScale, targetScale], 0.5, delta);
    
    // Continuous slow rotation
    groupRef.current.rotation.y += delta * 0.8;

    // Dynamic Pulsing Glow (Shimmering)
    if (materialRef.current) {
        const t = stateCtx.clock.elapsedTime;
        // Base shimmer + pulse
        materialRef.current.emissiveIntensity = 2.0 + Math.sin(t * 5) * 1.0; 
    }
  });

  return (
    <group ref={groupRef} position={[0, CONFIG.FOLIAGE.treeHeight / 2 + 1.5, 0]}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        
        {/* Star Mesh */}
        <mesh geometry={starGeometry}>
          <meshStandardMaterial
            ref={materialRef}
            color={COLORS.GOLD_METALLIC}
            emissive={COLORS.GOLD_HIGHLIGHT}
            emissiveIntensity={2}
            roughness={0.1}
            metalness={1.0}
            toneMapped={false}
          />
        </mesh>

        {/* 'XRX' Engraving - Front */}
        <Text
          position={[0, 0, 0.21]} 
          fontSize={0.35}
          letterSpacing={0.1}
          color={COLORS.EMERALD_DEEP} // Dark contrast for "engraved" look
          anchorX="center"
          anchorY="middle"
          fontWeight={800}
        >
          XRX
        </Text>

        {/* 'XRX' Engraving - Back */}
        <Text
          position={[0, 0, -0.21]} 
          rotation={[0, Math.PI, 0]}
          fontSize={0.35}
          letterSpacing={0.1}
          color={COLORS.EMERALD_DEEP}
          anchorX="center"
          anchorY="middle"
          fontWeight={800}
        >
          XRX
        </Text>

        {/* High-intensity Sparkles for Shimmer */}
        <Sparkles 
          count={80} 
          scale={3} 
          size={5} 
          speed={1.5} 
          opacity={1} 
          color="#FFF" 
        />
        
        {/* Inner Light Source */}
        <pointLight intensity={400} color={COLORS.GOLD_HIGHLIGHT} distance={8} decay={2} />
      </Float>
    </group>
  );
};
