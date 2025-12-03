import React, { useMemo, useRef, useLayoutEffect, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { easing } from 'maath';
import { GoogleGenAI } from "@google/genai";
import { TreeState } from '../types';
import { CONFIG, COLORS } from '../constants';

type OrnamentType = 'SPHERE' | 'BOX' | 'LIGHT' | 'PHOTO_SPHERE';

// Gemini AI Configuration
const CHARACTER_PROMPTS = [
  "A polaroid photo of Obanai Iguro from Demon Slayer, anime style, high quality, detailed, holding a white snake, white border",
  "A polaroid photo of Mitsuri Kanroji from Demon Slayer, anime style, high quality, pink and green hair, smiling brightly, white border",
  "A polaroid photo of Obanai Iguro and Mitsuri Kanroji eating sakura mochi together, anime style, romantic atmosphere, high quality, white border"
];

// Fallback/Initial Placeholders (Color blocks to match characters)
const PLACEHOLDER_COLORS = ['#FFFFFF', '#FFB7C5', '#E6E6FA']; 

interface OrnamentMeshProps {
  type: OrnamentType;
  state: TreeState;
  texture?: THREE.Texture | null;
  countOverride?: number;
  indexOffset?: number; // For positioning logic when splitting groups
  overrideColor?: string;
}

// Helper to generate positions
const generateData = (
  type: OrnamentType, 
  count: number, 
  indexOffset: number = 0, 
  totalCapacity: number = count
) => {
  const scatter = new Float32Array(count * 3);
  const tree = new Float32Array(count * 3);
  const rotation = new Float32Array(count * 3);
  const scales = new Float32Array(count);

  const { treeHeight, treeRadius, spreadRadius } = CONFIG.ORNAMENTS;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const globalIndex = i + indexOffset;

    // SCATTER: Sphere
    const r = spreadRadius * Math.cbrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    
    scatter[i3] = r * Math.sin(phi) * Math.cos(theta);
    scatter[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    scatter[i3 + 2] = r * Math.cos(phi);

    // TREE: Surface Spiral (Golden Angle)
    // Use globalIndex/totalCapacity to ensure correct vertical distribution across split groups
    const yNorm = globalIndex / totalCapacity; 
    const y = (yNorm * treeHeight) - (treeHeight / 2);
    
    // Cone radius at height y
    const rCone = (1 - yNorm) * treeRadius;
    const angle = globalIndex * 2.39996 * 5.0; // Golden angle * multiplier for density

    // Add slight offset for natural look
    const rOffset = type === 'BOX' ? 0.5 : (type === 'PHOTO_SPHERE' ? 0.6 : 0); 
    const rFinal = rCone + rOffset;

    tree[i3] = Math.cos(angle) * rFinal;
    tree[i3 + 1] = y;
    tree[i3 + 2] = Math.sin(angle) * rFinal;

    // Rotation
    rotation[i3] = Math.random() * Math.PI;
    rotation[i3 + 1] = Math.random() * Math.PI;
    rotation[i3 + 2] = Math.random() * Math.PI;

    // Scale variation
    let sizeBase = CONFIG.ORNAMENTS.spheres.size;
    if (type === 'BOX') sizeBase = CONFIG.ORNAMENTS.boxes.size;
    else if (type === 'PHOTO_SPHERE') sizeBase = CONFIG.ORNAMENTS.photoSpheres.size;
    else if (type === 'LIGHT') sizeBase = CONFIG.ORNAMENTS.lights.size;

    scales[i] = sizeBase * (0.8 + Math.random() * 0.4);
  }

  return { scatter, tree, rotation, scales, count };
};

const OrnamentMesh: React.FC<OrnamentMeshProps> = ({ 
  type, 
  state, 
  texture, 
  countOverride, 
  indexOffset = 0,
  overrideColor 
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Determine actual count
  const count = useMemo(() => {
    if (countOverride !== undefined) return countOverride;
    if (type === 'SPHERE') return CONFIG.ORNAMENTS.spheres.count;
    if (type === 'BOX') return CONFIG.ORNAMENTS.boxes.count;
    if (type === 'PHOTO_SPHERE') return CONFIG.ORNAMENTS.photoSpheres.count;
    return CONFIG.ORNAMENTS.lights.count;
  }, [type, countOverride]);

  // Determine total capacity for spiral calculation
  // If we are a subgroup (e.g. photo sphere 1 of 3), we need to know the total to space correctly
  const totalCapacity = useMemo(() => {
    if (type === 'PHOTO_SPHERE') return CONFIG.ORNAMENTS.photoSpheres.count;
    return count; 
  }, [type, count]);

  const data = useMemo(() => 
    generateData(type, count, indexOffset, totalCapacity), 
  [type, count, indexOffset, totalCapacity]);

  // Weight settings based on type
  const weight = useMemo(() => {
    if (type === 'BOX') return { damp: 0.4, float: 0.05 }; 
    if (type === 'SPHERE') return { damp: 0.6, float: 0.1 }; 
    if (type === 'PHOTO_SPHERE') return { damp: 0.5, float: 0.08 };
    return { damp: 0.8, float: 0.3 }; 
  }, [type]);

  useLayoutEffect(() => {
    if (meshRef.current) {
      for (let i = 0; i < data.count; i++) {
        dummy.position.set(data.scatter[i * 3], data.scatter[i * 3 + 1], data.scatter[i * 3 + 2]);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        // Set white color to allow texture to show pure, or override color if placeholder
        const color = overrideColor ? new THREE.Color(overrideColor) : new THREE.Color('#FFF');
        meshRef.current.setColorAt(i, color);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [data, dummy, overrideColor]);

  useFrame((stateCtx, delta) => {
    if (!meshRef.current) return;

    const targetT = state === TreeState.TREE_SHAPE ? 1 : 0;
    if (meshRef.current.userData.transition === undefined) meshRef.current.userData.transition = 0;
    easing.damp(meshRef.current.userData, 'transition', targetT, weight.damp, delta);
    const t = meshRef.current.userData.transition;
    const time = stateCtx.clock.getElapsedTime();

    for (let i = 0; i < data.count; i++) {
      const i3 = i * 3;
      
      const ix = data.scatter[i3];
      const iy = data.scatter[i3 + 1];
      const iz = data.scatter[i3 + 2];
      const tx = data.tree[i3];
      const ty = data.tree[i3 + 1];
      const tz = data.tree[i3 + 2];

      const floatAmp = weight.float * (1 - t * 0.9);
      const fx = Math.sin(time * 0.5 + i + indexOffset) * floatAmp;
      const fy = Math.cos(time * 0.3 + i + indexOffset) * floatAmp;
      const fz = Math.sin(time * 0.4 + i + indexOffset) * floatAmp;

      dummy.position.set(
        ix * (1 - t) + tx * t + fx,
        iy * (1 - t) + ty * t + fy,
        iz * (1 - t) + tz * t + fz
      );

      // Rotation logic
      if (type === 'BOX' || type === 'PHOTO_SPHERE') {
         dummy.rotation.set(
            data.rotation[i3] + time * 0.05,
            data.rotation[i3+1] + time * 0.05,
            data.rotation[i3+2]
         );
      } else {
         dummy.rotation.set(0, 0, 0); 
      }

      const scalePulse = type === 'LIGHT' ? (0.8 + 0.2*Math.sin(time*3+i)) : 1;
      dummy.scale.setScalar(data.scales[i] * scalePulse);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Geometry & Material Selection
  let geometry;
  let material;

  if (type === 'BOX') {
    geometry = <boxGeometry args={[1, 1, 1]} />;
    material = (
      <meshStandardMaterial 
        color={COLORS.GOLD_METALLIC} 
        roughness={0.2} 
        metalness={0.9} 
        envMapIntensity={2}
      />
    );
  } else if (type === 'SPHERE') {
    geometry = <icosahedronGeometry args={[1, 2]} />; 
    material = (
      <meshStandardMaterial 
        color={COLORS.GOLD_CHAMPAGNE} 
        roughness={0.0} 
        metalness={1.0} 
        envMapIntensity={2.5}
      />
    );
  } else if (type === 'PHOTO_SPHERE') {
    geometry = <sphereGeometry args={[1, 32, 32]} />;
    // If texture is present, use it. If not, fallback is handled by instanceColor (overrideColor)
    material = (
      <meshStandardMaterial 
        map={texture || null}
        color={'#ffffff'} 
        roughness={0.2} 
        metalness={0.1}
      />
    );
  } else {
    // LIGHTS
    geometry = <sphereGeometry args={[1, 8, 8]} />;
    material = (
      <meshStandardMaterial 
        color={COLORS.GOLD_HIGHLIGHT} 
        emissive={COLORS.GOLD_HIGHLIGHT}
        emissiveIntensity={2}
        toneMapped={false}
      />
    );
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      castShadow
      receiveShadow={type !== 'LIGHT'}
    >
      {geometry}
      {material}
    </instancedMesh>
  );
};

// Wrapper to handle AI generation and multiple photo groups
const PhotoOrnaments: React.FC<{ state: TreeState }> = ({ state }) => {
  const [generatedTextures, setGeneratedTextures] = useState<(THREE.Texture | null)[]>([null, null, null]);
  const hasFetched = useRef(false);
  
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const generate = async () => {
      try {
        if (!process.env.API_KEY) {
            console.warn("No API Key found for photo generation");
            return;
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const promises = CHARACTER_PROMPTS.map(async (prompt) => {
          try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image', // Nano Banana
                contents: { parts: [{ text: prompt }] },
            });
            
            // Extract base64
            // Iterate candidates to find inlineData
            let base64 = "";
            const parts = response.candidates?.[0]?.content?.parts;
            if (parts) {
                for (const part of parts) {
                    if (part.inlineData) {
                        base64 = part.inlineData.data;
                        break;
                    }
                }
            }
            
            if (base64) {
                const loader = new THREE.TextureLoader();
                const texture = await loader.loadAsync(`data:image/png;base64,${base64}`);
                texture.colorSpace = THREE.SRGBColorSpace;
                return texture;
            }
          } catch (e) {
             console.error("GenAI Error:", e);
          }
          return null;
        });

        const results = await Promise.all(promises);
        setGeneratedTextures(results);

      } catch (error) {
        console.error("Failed to generate ornaments:", error);
      }
    };

    generate();
  }, []);

  // Split total photo spheres into 3 groups
  const totalCount = CONFIG.ORNAMENTS.photoSpheres.count;
  const countPerGroup = Math.floor(totalCount / 3);

  return (
    <group>
      {generatedTextures.map((texture, index) => (
        <OrnamentMesh
          key={`photo-group-${index}`}
          type="PHOTO_SPHERE"
          state={state}
          countOverride={countPerGroup}
          indexOffset={index * countPerGroup}
          texture={texture}
          overrideColor={!texture ? PLACEHOLDER_COLORS[index] : undefined}
        />
      ))}
    </group>
  );
};

export const Ornaments: React.FC<{ state: TreeState }> = ({ state }) => {
  return (
    <group>
      <OrnamentMesh type="BOX" state={state} />
      <OrnamentMesh type="SPHERE" state={state} />
      <OrnamentMesh type="LIGHT" state={state} />
      <PhotoOrnaments state={state} />
    </group>
  );
};
