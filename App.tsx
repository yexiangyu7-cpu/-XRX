import React, { useState, Suspense } from 'react';
import { Scene } from './components/Scene';
import { UI } from './components/UI';
import { TreeState } from './types';

const App: React.FC = () => {
  const [treeState, setTreeState] = useState<TreeState>(TreeState.TREE_SHAPE);

  return (
    <div className="relative w-full h-full bg-[#000804]">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center text-[#C5A059] font-serif tracking-widest animate-pulse">
            INITIALIZING EXPERIENCE...
          </div>
        }>
          <Scene state={treeState} />
        </Suspense>
      </div>

      {/* UI Overlay Layer */}
      <UI state={treeState} setState={setTreeState} />
    </div>
  );
};

export default App;