import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TreeState } from '../types';
import { CONFIG, COLORS } from '../constants';

const vertexShader = `
  uniform float uTime;
  uniform float uProgress;
  uniform float uContainerHeight;
  
  attribute vec3 aScatterPos;
  attribute vec3 aTreePos;
  attribute float aRandom;
  attribute float aSize;

  varying vec3 vColor;
  varying float vAlpha;

  // Cubic bezier ease-in-out approximation for smoother shader transition
  float easeInOutCubic(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    float t = easeInOutCubic(uProgress);
    
    // Mix positions
    vec3 pos = mix(aScatterPos, aTreePos, t);
    
    // 1. BREATHING EFFECT (Wind)
    // Structured breathing when in tree form, chaotic when scattered
    float breatheFrequency = 1.0 + aRandom * 2.0;
    float breatheAmp = 0.15 * (1.0 - t * 0.5); // Less movement when assembled
    
    pos.x += sin(uTime * breatheFrequency + pos.y) * breatheAmp;
    pos.z += cos(uTime * breatheFrequency + pos.y) * breatheAmp;
    
    // 2. SCATTER FLOAT
    // Add independent floating noise when scattered
    if (t < 0.95) {
      float floatFactor = (1.0 - t);
      pos.y += sin(uTime * 0.5 + aRandom * 100.0) * 1.0 * floatFactor;
      pos.x += cos(uTime * 0.3 + aRandom * 50.0) * 0.5 * floatFactor;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // 3. SIZE ATTENUATION
    // Scale particles by distance and random factor
    float depthScale = 30.0; 
    gl_PointSize = aSize * depthScale * (1.0 / -mvPosition.z);
    
    // 4. COLOR VARYING
    // Pass randomness to fragment for sparkle
    vAlpha = 0.6 + 0.4 * sin(uTime * 2.0 + aRandom * 20.0);
  }
`;

const fragmentShader = `
  uniform vec3 uColorBase;
  uniform vec3 uColorTip;
  
  varying float vAlpha;

  void main() {
    // Soft circular particle
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    // Radial gradient alpha for soft look
    float strength = 1.0 - (dist * 2.0);
    strength = pow(strength, 1.5); // sharpen drop-off

    // Subtle color gradient
    vec3 color = mix(uColorBase, uColorTip, strength * 0.5);

    gl_FragColor = vec4(color, vAlpha * strength);
  }
`;

interface FoliageProps {
  state: TreeState;
}

export const Foliage: React.FC<FoliageProps> = ({ state }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Generate Geometry Data
  const { geometry, uniforms } = useMemo(() => {
    const count = CONFIG.FOLIAGE.count;
    const geometry = new THREE.BufferGeometry();
    
    const scatterPos = new Float32Array(count * 3);
    const treePos = new Float32Array(count * 3);
    const randoms = new Float32Array(count);
    const sizes = new Float32Array(count);

    const { treeHeight, treeRadius, spreadRadius, size } = CONFIG.FOLIAGE;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // SCATTER: Random Sphere Cloud
      const r = spreadRadius * Math.cbrt(Math.random()); // Uniform sphere distribution
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      
      scatterPos[i3] = r * Math.sin(phi) * Math.cos(theta);
      scatterPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      scatterPos[i3 + 2] = r * Math.cos(phi);

      // TREE: Volumetric Cone
      // We want points INSIDE the cone, not just on surface
      const h = Math.random() * treeHeight; // Random height
      const y = h - treeHeight / 2;
      
      // Max radius at this height
      const rMax = (1 - h / treeHeight) * treeRadius;
      // Random radius within max (Volume)
      const rTree = Math.sqrt(Math.random()) * rMax; 
      const angleTree = Math.random() * 2 * Math.PI;

      treePos[i3] = Math.cos(angleTree) * rTree;
      treePos[i3 + 1] = y;
      treePos[i3 + 2] = Math.sin(angleTree) * rTree;

      // Attributes
      randoms[i] = Math.random();
      sizes[i] = size * (0.5 + Math.random() * 1.5);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(scatterPos, 3)); // Use scatter as initial 'position' attribute mostly for bounding box
    geometry.setAttribute('aScatterPos', new THREE.BufferAttribute(scatterPos, 3));
    geometry.setAttribute('aTreePos', new THREE.BufferAttribute(treePos, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const uniforms = {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uColorBase: { value: new THREE.Color(COLORS.EMERALD_DEEP) },
      uColorTip: { value: new THREE.Color(COLORS.EMERALD_LIGHT) },
    };

    return { geometry, uniforms };
  }, []);

  useFrame((stateCtx, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = stateCtx.clock.elapsedTime;
      
      // Linear interpolation of progress uniform
      const target = state === TreeState.TREE_SHAPE ? 1 : 0;
      const current = materialRef.current.uniforms.uProgress.value;
      const step = (target - current) * (CONFIG.ANIMATION.dampSpeed * 2) * delta * 60; // Frame rate independent damp
      
      materialRef.current.uniforms.uProgress.value += step;
    }
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};