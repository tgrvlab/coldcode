import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Code2, Terminal, RefreshCw } from 'lucide-react';
import { generateSrcDoc } from '@/lib/runner';

const CodeRunner = ({ isOpen, onClose, code, filename, srcDoc: initialSrcDoc }) => {
  const [mounted, setMounted] = useState(false);
  const iframeRef = useRef(null);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleRestart = () => {
    const iframe = iframeRef.current;
    if (iframe) {
      const ext = filename?.split('.').pop().toLowerCase() || 'js';
      iframe.srcdoc = generateSrcDoc(code, ext);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-10">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl h-[90vh] bg-(--background) border border-(--border) rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-500">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border) bg-(--card)">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-(--accent)/10 flex items-center justify-center text-(--accent)">
              <Terminal size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-(--foreground)">Live Execution</h2>
              <p className="text-[10px] text-(--muted) font-medium uppercase tracking-widest">{filename}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
                onClick={handleRestart}
                className="p-2 text-(--muted) hover:text-(--accent) transition-all hover:bg-(--accent)/5 rounded-lg"
                title="Restart"
            >
              <RefreshCw size={18} />
            </button>
            <button onClick={onClose} className="p-2 text-(--muted) hover:text-(--foreground) transition-all hover:bg-(--card-hover) rounded-lg border border-(--border)">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Output Area */}
        <div className="flex-1 bg-[#020202]">
          <iframe
            ref={iframeRef}
            srcDoc={initialSrcDoc || generateSrcDoc(code, filename?.split('.').pop().toLowerCase() || 'js')}
            className="w-full h-full border-0"
            title="Code Preview"
            sandbox="allow-scripts"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-(--border) bg-(--card) flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-(--muted) font-bold uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Runtime Active
            </div>
            <span className="text-[10px] text-(--muted) font-medium italic">Execution results may vary based on environment.</span>
        </div>
      </div>
    </div>
  );
};

export default CodeRunner;
