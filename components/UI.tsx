import React from 'react';
import { TreeState } from '../types';
import { Sparkles, Star } from 'lucide-react';

interface UIProps {
  state: TreeState;
  setState: (s: TreeState) => void;
}

export const UI: React.FC<UIProps> = ({ state, setState }) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-8 z-10">
      
      {/* Controls */}
      <div className="mb-16 flex justify-center pointer-events-auto">
        <button
          onClick={() => setState(state === TreeState.TREE_SHAPE ? TreeState.SCATTERED : TreeState.TREE_SHAPE)}
          className="group relative px-10 py-5 bg-[#001A0E]/90 backdrop-blur-xl border border-[#C5A059]/40 rounded-full overflow-hidden transition-all duration-500 hover:border-[#C5A059] hover:shadow-[0_0_40px_rgba(197,160,89,0.4)] active:scale-95"
        >
          {/* Button Background Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#C5A059]/0 via-[#C5A059]/20 to-[#C5A059]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          
          <div className="flex items-center gap-4">
            <span className={`text-[#C5A059] transition-transform duration-700 ease-spring ${state === TreeState.SCATTERED ? 'rotate-180' : ''}`}>
               {state === TreeState.TREE_SHAPE ? <Star className="w-6 h-6 fill-[#C5A059]" /> : <Sparkles className="w-6 h-6" />}
            </span>
            <span className="text-[#F9E29C] font-serif tracking-widest text-sm uppercase font-bold">
              {state === TreeState.TREE_SHAPE ? 'Disperse Elements' : 'Assemble Form'}
            </span>
          </div>
        </button>
      </div>
      
      {/* Footer / Credits */}
      <div className="absolute bottom-6 right-8 text-[#3a5c48] text-[10px] font-bold tracking-[0.2em] opacity-80 uppercase">
        Interactive 3D Experience
      </div>
    </div>
  );
};