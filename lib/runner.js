export const generateSrcDoc = (codeContent, extension) => {
  const ext = extension?.toLowerCase() || 'js';
  const isReact = ['jsx', 'tsx'].includes(ext) || codeContent.includes('React.') || (codeContent.includes('<') && (codeContent.includes('return') || codeContent.includes('=>')));
  const isHtml = ext === 'html' || (codeContent.trim().startsWith('<') && !isReact && !codeContent.includes('import ') && !codeContent.includes('export '));
  const isCss = ext === 'css';

  if (isHtml) return `
    <html>
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
          body { 
            background: #020202; 
            margin: 0; 
            padding: 32px; 
            color: #d1d1d1; 
            font-family: 'JetBrains Mono', monospace; 
          }
        </style>
      </head>
      <body>
        ${codeContent}
      </body>
    </html>
  `;
  
  if (isCss) return `
    <html>
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { margin: 0; background: #020202; color: white; font-family: sans-serif; }
          .preview-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 24px;
            padding: 40px;
            backdrop-filter: blur(20px);
            text-align: center;
          }
        </style>
        <style>${codeContent}</style>
      </head>
      <body class="min-h-screen flex items-center justify-center">
        <div class="preview-card animate-in zoom-in-95 duration-700">
           <div class="w-12 h-12 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin mx-auto mb-6"></div>
           <div class="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-2">CSS Engine Active</div>
           <div class="text-xs text-white/40 italic">Global styles applied to body.</div>
        </div>
      </body>
    </html>
  `;

  const cleanCode = codeContent
    .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
    .replace(/export\s+/g, '');

  return `
    <html>
      <head>
        <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
          body { 
            background: #020202; 
            margin: 0; 
            padding: 32px; 
            color: #d1d1d1; 
            font-family: 'JetBrains Mono', monospace; 
            overflow: auto; 
            scrollbar-width: thin;
            scrollbar-color: #333 transparent;
          }
          #root { width: 100%; height: 100%; }
          .console-log { 
            padding: 12px 16px; 
            border-left: 4px solid #ff4655; 
            background: rgba(255,255,255,0.02);
            border-radius: 4px;
            margin-bottom: 8px;
            font-size: 12px;
            animation: slideIn 0.3s ease-out;
          }
          @keyframes slideIn { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }
          .err-box {
            padding: 20px;
            border: 1px solid rgba(248,113,113,0.3);
            background: rgba(248,113,113,0.05);
            border-radius: 12px;
            color: #f87171;
            font-size: 12px;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script>
          const logs = [];
          const root = document.getElementById('root');
          
          window.onerror = (e) => {
             root.innerHTML = '<div class="err-box">Runtime Error: ' + e + '</div>';
          };

          console.log = (...args) => {
            const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            logs.push(msg);
            if (!${isReact}) {
              const div = document.createElement('div');
              div.className = 'console-log';
              div.innerText = msg;
              root.appendChild(div);
            }
          };
        </script>
        <script type="text/babel" data-presets="typescript,react">
          (async () => {
            const React = window.React;
            const ReactDOM = window.ReactDOM;
            const { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect, useReducer, useContext } = React;
            
            try {
              ${cleanCode}

              if (${isReact}) {
                 const AppFinder = () => {
                   if (typeof App !== 'undefined') return <App />;
                   if (typeof Main !== 'undefined') return <Main />;
                   if (typeof main !== 'undefined') {
                      const MainComp = main;
                      return <MainComp />;
                   }
                   if (typeof Card !== 'undefined') return <Card />;
                   
                   // Fallback: try to find any function starting with uppercase
                   // Since we are in a scoped script, we can't easily iterate local variables
                   // but we've checked the most common ones.
                   return <div className="p-10 text-white/20 text-[10px] uppercase font-black text-center tracking-widest border border-white/5 rounded-3xl">Ready for Component...</div>;
                 };
                 ReactDOM.createRoot(root).render(<AppFinder />);
              } else if (logs.length === 0) {
                 root.innerHTML = '<div class="h-full flex flex-col items-center justify-center opacity-20"><div class="text-[10px] uppercase font-black tracking-widest">Logic Executed</div><div class="text-[9px] italic">No console activity</div></div>';
              }
            } catch(err) {
              root.innerHTML = '<div class="err-box">Exception: ' + err.message + '</div>';
            }
          })();
        </script>
      </body>
    </html>
  `;
};
