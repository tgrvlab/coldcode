'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Code2, Type, Send, Palette, CheckCircle2, Settings2, ShieldCheck, MessageSquareOff, GitBranchPlus } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { getLangInfo, configureMonaco } from '@/lib/codeUtils';

const CreatePostModal = ({ isOpen, onClose, onPost, initialData = null }) => {
  const [activeTab, setActiveTab] = useState('details'); 
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [theme, setTheme] = useState('github');
  const [allowComments, setAllowComments] = useState(true);
  const [allowRemixes, setAllowRemixes] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-fill state if initialData (forking) is provided
  useEffect(() => {
    if (initialData && isOpen) {
      setCode(initialData.code || '');
      setDescription(initialData.description || '');
      setLanguage(initialData.language || 'javascript');
      setTheme(initialData.theme || 'github');
      setAllowComments(initialData.allowComments !== undefined ? initialData.allowComments : true);
      setAllowRemixes(initialData.allowRemixes !== undefined ? initialData.allowRemixes : true);
    } else if (!isOpen) {
      setCode('');
      setDescription('');
      setGithubUrl('');
      setLanguage('javascript');
      setTheme('github');
      setAllowComments(true);
      setAllowRemixes(true);
      setActiveTab('details');
    }
  }, [initialData, isOpen]);

  // Tag Suggestion State
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const textareaRef = useRef(null);

  const suggestedTags = [
    'react', 'nextjs', 'typescript', 'rust', 'golang', 'frontend', 'backend', 'web3', 'ai', 'ui', 'animation', 'performance', 'css', 'html', 'python', 'javascript', 'tailwind', 'vercel', 'mobile', 'api'
  ];

  const handleDescriptionChange = (e) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    setDescription(value);

    // Detect hashtag typing
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastHashIndex = textBeforeCursor.lastIndexOf('#');
    
    if (lastHashIndex !== -1) {
      const textAfterHash = textBeforeCursor.substring(lastHashIndex + 1);
      if (!textAfterHash.includes(' ') && !textAfterHash.includes('\n')) {
        setTagQuery(textAfterHash.toLowerCase());
        setShowTagSuggestions(true);
        return;
      }
    }
    
    setShowTagSuggestions(false);
  };

  const selectTag = (tag) => {
    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = description.substring(0, cursorPosition);
    const lastHashIndex = textBeforeCursor.lastIndexOf('#');
    
    const tagToInsert = `#${tag} `;
    const newDescription = 
      description.substring(0, lastHashIndex) + 
      tagToInsert + 
      description.substring(cursorPosition);
    
    // Calculate new cursor position correctly: start position of # + length of tag string
    const newCursorPos = lastHashIndex + tagToInsert.length;
    
    setDescription(newDescription);
    setShowTagSuggestions(false);
    
    // Maintain focus and accurately place cursor at the end of the NEW tag
    setTimeout(() => {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handlePost = () => {
    if (!code.trim() || !description.trim()) return;
    onPost({ code, description, githubUrl, language, theme, allowComments, allowRemixes });
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const themes = [
    { id: 'red', name: 'Cold Red', color: 'var(--accent)', monaco: 'cold-red' },
    { id: 'vscode', name: 'VS Code', color: '#007acc', monaco: 'vs-code' },
    { id: 'github', name: 'GitHub', color: '#58a6ff', monaco: 'github-dark' },
    { id: 'vercel', name: 'Vercel', color: '#ffffff', monaco: 'vercel-dark' },
  ];

  const languagesList = [
    { id: 'javascript', name: 'JavaScript' },
    { id: 'jsx', name: 'JSX (React)' },
    { id: 'typescript', name: 'TypeScript' },
    { id: 'tsx', name: 'TSX (React)' },
    { id: 'python', name: 'Python' },
    { id: 'rust', name: 'Rust' },
    { id: 'go', name: 'Go' },
    { id: 'cpp', name: 'C++' },
    { id: 'css', name: 'CSS' },
    { id: 'html', name: 'HTML' },
  ];

  const filteredTags = suggestedTags.filter(t => t.startsWith(tagQuery));
  const activeTheme = themes.find(t => t.id === theme);
  const isFormValid = code.trim().length > 0 && description.trim().length > 0;
  const lineCount = code.trim() ? code.split('\n').length : 0;
  const totalSize = code.length;
  const descLines = description.trim() ? description.split('\n').length : 0;
  const isTooLarge = totalSize > 10000 || lineCount > 100 || descLines > 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 transition-colors duration-500">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl h-[85vh] bg-(--background) border border-(--border) rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] flex flex-col transition-all">
        {/* Modal Main Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border) bg-(--card)">
           <div className="flex items-center gap-6">
              <button 
                onClick={() => setActiveTab('details')}
                className={`py-2 px-4 rounded-lg flex items-center gap-2 text-xs font-black transition-all ${activeTab === 'details' ? 'bg-(--accent) text-black' : 'text-(--muted) hover:bg-(--card-hover)'}`}
              >
                 <Type size={14} /> 1. DETAILS
              </button>
              <button 
                onClick={() => setActiveTab('code')}
                className={`py-2 px-4 rounded-lg flex items-center gap-2 text-xs font-black transition-all ${activeTab === 'code' ? 'bg-(--accent) text-black' : 'text-(--muted) hover:bg-(--card-hover)'}`}
              >
                 <Code2 size={14} /> 2. CODE
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-4 rounded-lg flex items-center gap-2 text-xs font-black transition-all ${activeTab === 'settings' ? 'bg-(--accent) text-black' : 'text-(--muted) hover:bg-(--card-hover)'}`}
              >
                 <Settings2 size={14} /> 3. SETTINGS
              </button>
           </div>
           
           <div className="flex items-center gap-4">
              <button 
                 onClick={handlePost}
                 disabled={!isFormValid || isTooLarge}
                 className={`px-8 py-2.5 rounded-full text-[10px] font-black tracking-widest transition-all shadow-2xl flex items-center gap-2 active:scale-95 ${isFormValid && !isTooLarge ? 'bg-white text-black hover:bg-zinc-200' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
              >
                 {initialData ? 'PUBLISH FORK' : 'SHARE SNIPPET'}
              </button>
              <button onClick={onClose} className="p-2 text-(--muted) hover:text-(--foreground)">
                 <X size={18} />
              </button>
           </div>
        </div>

        {/* Tab Driven Body */}
        <div className="flex-1 flex overflow-hidden relative">
           
           {/* Tab 1: Details */}
           {activeTab === 'details' && (
              <div className="flex-1 flex flex-col p-10 items-center justify-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                 <div className="w-full max-w-2xl space-y-8">
                    <div className="space-y-4">
                       <label className="text-[11px] font-black uppercase tracking-[0.4em] text-(--muted) ml-2 flex items-center gap-2">
                          <Type size={14} /> Description
                       </label>
                       <div className="relative">
                           <textarea
                            ref={textareaRef}
                            value={description}
                            onChange={handleDescriptionChange}
                            maxLength={500}
                            placeholder="What does this code do? use #tags for discoverability"
                            className="w-full h-48 p-6 bg-white/5 border border-white/10 rounded-3xl text-xl font-medium focus:border-(--accent)/50 outline-none transition-all placeholder:text-white/10 leading-relaxed scrollbar-hide resize-none"
                          />
                          <div className="absolute bottom-6 right-8 flex items-center gap-4">
                             <div className={`text-[10px] font-black uppercase tracking-widest ${descLines > 10 ? 'text-red-500' : 'text-(--muted)'}`}>
                                {descLines} / 10 LINES
                             </div>
                             <div className={`text-[10px] font-black uppercase tracking-widest ${description.length >= 450 ? 'text-red-500' : 'text-(--muted)'}`}>
                                {description.length} / 500 CHARS
                             </div>
                          </div>
                       </div>
                       {showTagSuggestions && filteredTags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                             {filteredTags.map(tag => (
                                <button key={tag} onClick={() => selectTag(tag)} className="px-4 py-1.5 bg-(--accent)/10 text-(--accent) rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-(--accent) hover:text-black transition-all">
                                   #{tag}
                                </button>
                             ))}
                          </div>
                       )}
                    </div>
                    
                    <div className="pt-10 flex items-center justify-between">
                       <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-(--muted) uppercase tracking-widest">Next Step</span>
                          <span className="text-white/40 text-[9px] font-medium">Injection logic and styling</span>
                       </div>
                       <button 
                         onClick={() => setActiveTab('code')}
                         className="px-10 py-4 bg-zinc-900 border border-white/5 hover:border-(--accent)/30 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-black"
                       >
                          Open Editor
                       </button>
                    </div>
                 </div>
              </div>
           )}

           {/* Tab 2: Code & Engine */}
           {activeTab === 'code' && (
              <div className="flex-1 flex overflow-hidden animate-in fade-in duration-500">
                 <div className="flex-1 relative bg-[#020202] flex flex-col">
                    <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-black/40">
                        <div className="flex items-center gap-6">
                           <div className="flex flex-col">
                              <span className="text-[9px] font-black text-(--muted) uppercase tracking-widest opacity-50">Editor Telemetry</span>
                              <div className="flex items-center gap-4 mt-0.5">
                                 <span className={`text-[10px] font-black tracking-tight ${lineCount > 100 ? 'text-red-500' : 'text-white/40'}`}>
                                    {lineCount} / 100 LINES
                                 </span>
                                 <span className={`text-[10px] font-black tracking-tight ${totalSize > 10000 ? 'text-red-500' : 'text-white/40'}`}>
                                    {(totalSize / 1024).toFixed(1)} KB / 10 KB
                                 </span>
                              </div>
                           </div>
                        </div>
                        {isTooLarge && (
                           <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                             <span className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em]">Exceeded Safe Limits</span>
                           </div>
                        )}
                    </div>
                    <Editor
                      height="100%"
                      language={language === 'jsx' ? 'javascript' : language === 'tsx' ? 'typescript' : language}
                      theme={activeTheme.monaco}
                      value={code}
                      beforeMount={configureMonaco}
                      onChange={(val) => setCode(val || '')}
                      options={{ 
                        fontSize: 15, 
                        minimap: { enabled: false }, 
                        padding: { top: 30, bottom: 30 }, 
                        lineNumbers: 'on', 
                        automaticLayout: true,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        lineHeight: 24,
                        smoothScrolling: true,
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on'
                      }}
                    />
                 </div>
                 <div className="w-80 bg-(--card) border-l border-(--border) p-8 space-y-10 overflow-y-auto scrollbar-hide">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-(--muted) uppercase tracking-[0.2em] flex items-center gap-2">
                          <Code2 size={12} /> Language
                       </label>
                       <div className="grid grid-cols-1 gap-1.5">
                          {languagesList.map(lang => (
                             <button
                               key={lang.id}
                               onClick={() => setLanguage(lang.id)}
                               className={`w-full p-4 rounded-xl border text-[11px] font-black transition-all flex items-center gap-4 ${language === lang.id ? 'bg-(--accent)/10 border-(--accent) text-(--foreground)' : 'bg-black border-white/5 text-(--muted) hover:border-white/20'}`}
                             >
                                <span className={language === lang.id ? 'scale-125' : 'opacity-40 grayscale'}>{getLangInfo(`file.${lang.id}`).icon}</span>
                                {lang.name}
                             </button>
                          ))}
                       </div>
                    </div>

                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-(--muted) uppercase tracking-[0.2em] flex items-center gap-2">
                          <Palette size={12} /> Theme Styles
                       </label>
                       <div className="grid grid-cols-1 gap-1.5">
                          {themes.map(t => (
                             <button
                               key={t.id}
                               onClick={() => setTheme(t.id)}
                               className={`w-full p-4 rounded-xl border text-[11px] font-black transition-all flex items-center gap-4 ${theme === t.id ? 'bg-white/5 border-white/20 text-white' : 'bg-black border-white/5 text-(--muted) hover:border-white/20'}`}
                             >
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                                {t.name}
                             </button>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
           )}

           {/* Tab 3: Settings & Permissions */}
           {activeTab === 'settings' && (
              <div className="flex-1 flex flex-col items-center justify-center p-10 animate-in fade-in zoom-in-95 duration-500">
                 <div className="w-full max-w-xl space-y-10">
                    <div className="text-center space-y-2">
                       <ShieldCheck className="mx-auto text-(--accent) opacity-40 mb-4" size={48} />
                       <h3 className="text-2xl font-black italic tracking-tight uppercase">Protection Protocol</h3>
                       <p className="text-(--muted) text-sm font-medium">Configure how the global network interacts with this artifact</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                       <button 
                         onClick={() => setAllowComments(!allowComments)}
                         className={`p-6 rounded-3xl border flex items-center justify-between group transition-all ${allowComments ? 'bg-white/5 border-white/10 hover:border-white/30' : 'bg-(--accent)/5 border-(--accent)/20'}`}
                       >
                          <div className="flex items-center gap-5">
                             <div className={`p-4 rounded-2xl transition-colors ${allowComments ? 'bg-white/5 text-white' : 'bg-(--accent)/10 text-(--accent)'}`}>
                                {allowComments ? <CheckCircle2 size={24} /> : <MessageSquareOff size={24} />}
                             </div>
                             <div className="flex flex-col items-start">
                                <span className={`text-md font-black uppercase tracking-widest ${allowComments ? 'text-white' : 'text-(--accent)'}`}>{allowComments ? 'Comments On' : 'Comments Off'}</span>
                                <span className="text-[11px] text-(--muted) font-medium italic mt-1">{allowComments ? 'Allow others to post comments' : 'Restrict interaction to read-only'}</span>
                             </div>
                          </div>
                          <div className={`w-12 h-6 rounded-full relative transition-colors ${allowComments ? 'bg-(--accent)' : 'bg-white/10'}`}>
                             <div className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-all ${allowComments ? 'right-1' : 'left-1'}`} />
                          </div>
                       </button>

                       <button 
                         onClick={() => setAllowRemixes(!allowRemixes)}
                         className={`p-6 rounded-3xl border flex items-center justify-between group transition-all ${allowRemixes ? 'bg-white/5 border-white/10 hover:border-white/30' : 'bg-(--accent)/5 border-(--accent)/20'}`}
                       >
                          <div className="flex items-center gap-5">
                             <div className={`p-4 rounded-2xl transition-colors ${allowRemixes ? 'bg-white/5 text-white' : 'bg-(--accent)/10 text-(--accent)'}`}>
                                {allowRemixes ? <GitBranchPlus size={24} /> : <ShieldCheck size={24} />}
                             </div>
                             <div className="flex flex-col items-start">
                                <span className={`text-md font-black uppercase tracking-widest ${allowRemixes ? 'text-white' : 'text-(--accent)'}`}>{allowRemixes ? 'Remixing On' : 'Remixing Off'}</span>
                                <span className="text-[11px] text-(--muted) font-medium italic mt-1">{allowRemixes ? 'Allow forks and derivative versions' : 'Block forking of this post'}</span>
                             </div>
                          </div>
                          <div className={`w-12 h-6 rounded-full relative transition-colors ${allowRemixes ? 'bg-(--accent)' : 'bg-white/10'}`}>
                             <div className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-all ${allowRemixes ? 'right-1' : 'left-1'}`} />
                          </div>
                       </button>
                    </div>

                    
                 </div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
