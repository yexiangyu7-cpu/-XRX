import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Environment, Sparkles } from '@react-three/drei';
import { COLORS } from '../constants';

const Snow: React.FC = () => {
  const mesh = useRef<THREE.Points>(null);
  const count = 4000; // Increased count for heavy snowfall
  
  // Generate static attributes
  const { positions, speeds, sizes, randoms } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    const randoms = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // Wide spread to cover the camera movement area
      positions[i * 3] = (Math.random() - 0.5) * 100;     // x
      positions[i * 3 + 1] = (Math.random() - 0.5) * 80;  // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100; // z
      
      speeds[i] = 2.0 + Math.random() * 5.0; // Falling speed
      // Larger size range for visibility
      sizes[i] = 0.5 + Math.random() * 0.8; 
      randoms[i] = Math.random();
    }
    return { positions, speeds, sizes, randoms };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#FFFFFF') },
    uHeight: { value: 80.0 } // Matches the Y spread roughly
  }), []);

  useFrame((state) => {
    if (mesh.current && mesh.current.material) {
      (mesh.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  const vertexShader = `
    uniform float uTime;
    uniform float uHeight;
    attribute float aSpeed;
    attribute float aSize;
    attribute float aRandom;
    varying float vAlpha;
    
    void main() {
      vec3 pos = position;
      
      // Falling dynamics
      float fallOffset = uTime * aSpeed;
      
      // Loop Y position: Start high, fall down, reset to top
      float topY = uHeight / 2.0;
      pos.y = topY - mod(pos.y + fallOffset, uHeight);
      
      // Horizontal drift (Wind)
      float wind = sin(uTime * 0.5 + aRandom * 10.0) * 2.0;
      pos.x += wind * 0.5;
      pos.z += cos(uTime * 0.3 + aRandom * 5.0) * 0.5;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Size attenuation
      gl_PointSize = aSize * (300.0 / -mvPosition.z);
      
      // Twinkle alpha
      vAlpha = 0.6 + 0.4 * sin(uTime * 2.0 + aRandom * 10.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor;
    varying float vAlpha;
    
    void main() {
      // Soft circle
      float r = distance(gl_PointCoord, vec2(0.5));
      if (r > 0.5) discard;
      
      // Soft glow edge
      float strength = 1.0 - (r * 2.0);
      strength = pow(strength, 1.5);
      
      gl_FragColor = vec4(uColor, vAlpha * strength * 0.95);
    }
  `;

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aSpeed" count={count} array={speeds} itemSize={1} />
        <bufferAttribute attach="attributes-aSize" count={count} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-aRandom" count={count} array={randoms} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial 
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export const Background: React.FC = () => {
  return (
    <>
      <color attach="background" args={[COLORS.BACKGROUND_GRADIENT_OUTER]} />
      {/* Subtle fog for depth */}
      <fog attach="fog" args={[COLORS.BACKGROUND_GRADIENT_OUTER, 10, 60]} />
      
      {/* Studio Lighting Environment */}
      <Environment preset="city" environmentIntensity={0.5} />
      
      {/* Ambient floating dust */}
      <Sparkles 
        count={500} 
        scale={40} 
        size={4} 
        speed={0.4} 
        opacity={0.3} 
        color={COLORS.GOLD_CHAMPAGNE} 
      />

      {/* Falling Snow Effect */}
      <Snow />
    </>
  );
};
