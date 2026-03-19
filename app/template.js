'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function Template({ children }) {
  const pathname = usePathname();

  return (
    <div className="w-full relative overflow-hidden bg-(--background)">
      {/* Liquid Screen Wipe Overlay */}
      <motion.div
        key={pathname + "-overlay"}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 0 }}
        exit={{ scaleY: 1 }}
        transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
        style={{ originY: 1 }}
        className="fixed inset-0 z-100 bg-(--accent) pointer-events-none flex items-center justify-center"
      >
         <div className="flex flex-col items-center gap-4">
            <h1 className="text-6xl font-black text-black tracking-tighter uppercase italic">COLDCODE</h1>
            <span className="text-black/40 text-[10px] font-black uppercase tracking-[0.6em] ml-2 animate-pulse">{pathname}</span>
         </div>
      </motion.div>
      
      <motion.div
        key={pathname + "-curtain"}
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        exit={{ scaleY: 0 }}
        transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
        style={{ originY: 0 }}
        className="fixed inset-0 z-100 bg-(--accent) pointer-events-none flex items-center justify-center"
      >
         <div className="flex flex-col items-center gap-4">
            <h1 className="text-6xl font-black text-black tracking-tighter uppercase italic">COLDCODE</h1>
            <span className="text-black/40 text-[10px] font-black uppercase tracking-[0.6em] ml-2">{pathname}</span>
         </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full"
      >
        {children}
      </motion.div>
    </div>
  );
}
