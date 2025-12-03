export enum TreeState {
  SCATTERED = 'SCATTERED',
  TREE_SHAPE = 'TREE_SHAPE'
}

export interface PositionData {
  scatter: Float32Array;
  tree: Float32Array;
  rotation: Float32Array;
  scales: Float32Array;
}

export interface ParticleConfig {
  count: number;
  color: string;
  size: number;
  spreadRadius: number;
  treeHeight: number;
  treeRadius: number;
}