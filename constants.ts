import { ThreeElements } from '@react-three/fiber';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      [key: string]: any;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      [key: string]: any;
    }
  }
}

export const COLORS = {
  EMERALD_DEEP: '#001A0E',
  EMERALD_BASE: '#004225',
  EMERALD_LIGHT: '#106338',
  GOLD_METALLIC: '#D4AF37',
  GOLD_CHAMPAGNE: '#F7E7CE',
  GOLD_HIGHLIGHT: '#FFED8A',
  BACKGROUND_GRADIENT_INNER: '#020f08',
  BACKGROUND_GRADIENT_OUTER: '#000000',
};

export const CONFIG = {
  FOLIAGE: {
    count: 25000, // High count for volume
    size: 0.25,
    treeHeight: 18,
    treeRadius: 7,
    spreadRadius: 35,
  },
  ORNAMENTS: {
    spheres: {
      count: 120, // Reduced slightly to make room for photo spheres
      size: 0.5,
    },
    photoSpheres: {
      count: 24, // Special photo ornaments
      size: 0.75,
    },
    boxes: {
      count: 60,
      size: 0.6,
    },
    lights: {
      count: 400,
      size: 0.15,
    },
    treeHeight: 18,
    treeRadius: 7.5, // Slightly larger to sit on surface
    spreadRadius: 40,
  },
  ANIMATION: {
    dampSpeed: 0.6, // Slower, heavier transition
    floatSpeed: 0.2, 
  }
};