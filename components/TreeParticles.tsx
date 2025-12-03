import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import { TreeState } from '../types';
import { CONFIG } from '../constants';

interface TreeParticlesProps {
  state: TreeState;
  type: 'NEEDLES' | 'ORNAMENTS';
}

export const TreeParticles: React.FC<TreeParticlesProps> = ({ state, type }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Construct a compatible config object based on type
  const config = useMemo(() => {
    if (type === 'NEEDLES') {
      return {
        count: CONFIG.FOLIAGE.count,
        size: CONFIG.FOLIAGE.size,
        treeHeight: CONFIG.FOLIAGE.treeHeight,
        treeRadius: CONFIG.FOLIAGE.treeRadius,
        spreadRadius: CONFIG.FOLIAGE.spreadRadius
      };
    }
    // Default to sphere settings for generic ornaments usage
    return {
      count: CONFIG.ORNAMENTS.spheres.count,
      size: CONFIG.ORNAMENTS.spheres.size,
      treeHeight: CONFIG.ORNAMENTS.treeHeight,
      treeRadius: CONFIG.ORNAMENTS.treeRadius,
      spreadRadius: CONFIG.ORNAMENTS.spreadRadius
    };
  }, [type]);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Pre-calculate positions
  const data = useMemo(() => {
    const scatter = new Float32Array(config.count * 3);
    const tree = new Float32Array(config.count * 3);
    const scales = new Float32Array(config.count);

    for (let i = 0; i < config.count; i++) {
      const i3 = i * 3;

      // 1. SCATTER
      const r = config.spreadRadius * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      
      scatter[i3] = r * Math.sin(phi) * Math.cos(theta);
      scatter[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      scatter[i3 + 2] = r * Math.cos(phi);

      // 2. TREE
      if (type === 'NEEDLES') {
        const h = Math.random() * config.treeHeight;
        const y = h - config.treeHeight / 2;
        const rMax = (1 - h / config.treeHeight) * config.treeRadius;
        const rTree = Math.sqrt(Math.random()) * rMax;
        const angle = Math.random() * 2 * Math.PI;
        
        tree[i3] = Math.cos(angle) * rTree;
        tree[i3 + 1] = y;
        tree[i3 + 2] = Math.sin(angle) * rTree;
      } else {
        const yNorm = i / config.count;
        const y = (yNorm * config.treeHeight) - (config.treeHeight / 2);
        const rCone = (1 - yNorm) * config.treeRadius;
        const angle = i * 2.39996 * 5.0;
        
        tree[i3] = Math.cos(angle) * rCone;
        tree[i3 + 1] = y;
        tree[i3 + 2] = Math.sin(angle) * rCone;
      }

      scales[i] = Math.random();
    }
    return { scatter, tree, scales };
  }, [config, type]);

  useLayoutEffect(() => {
    if (meshRef.current) {
      for (let i = 0; i < config.count; i++) {
        dummy.position.set(data.scatter[i*3], data.scatter[i*3+1], data.scatter[i*3+2]);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [config, data, dummy]);

  useFrame((stateCtx, delta) => {
    if (!meshRef.current) return;
    
    // Smooth transition logic
    const targetT = state === TreeState.TREE_SHAPE ? 1 : 0;
    // We use a custom property on userdata to store current transition state
    if (meshRef.current.userData.transition === undefined) meshRef.current.userData.transition = 0;
    
    easing.damp(meshRef.current.userData, 'transition', targetT, 0.5, delta);
    const t = meshRef.current.userData.transition;

    for (let i = 0; i < config.count; i++) {
      const i3 = i * 3;
      const mx = data.scatter[i3] * (1 - t) + data.tree[i3] * t;
      const my = data.scatter[i3 + 1] * (1 - t) + data.tree[i3 + 1] * t;
      const mz = data.scatter[i3 + 2] * (1 - t) + data.tree[i3 + 2] * t;

      dummy.position.set(mx, my, mz);
      
      const scale = config.size * (type === 'NEEDLES' ? data.scales[i] : 1);
      dummy.scale.setScalar(scale);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, config.count]}>
      {type === 'NEEDLES' ? (
        <coneGeometry args={[1, 3, 4]} />
      ) : (
        <sphereGeometry args={[1, 8, 8]} />
      )}
      <meshStandardMaterial color="#fff" />
    </instancedMesh>
  );
};