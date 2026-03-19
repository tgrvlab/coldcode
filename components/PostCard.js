'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageSquareCode, GitBranchPlus, PlayCircle, MoreHorizontal, ChevronDown, X, Terminal, Loader2, Maximize2 } from 'lucide-react';
import { RiVerifiedBadgeFill, RiThumbUpLine, RiThumbUpFill, RiRepeatLine, RiCodeSSlashLine, RiCheckboxCircleFill, RiShieldStarFill, RiGitBranchLine } from 'react-icons/ri';
import { toast } from 'react-hot-toast';
import { getLangInfo, highlightCode, getThemeStyles } from '@/lib/codeUtils';
import { generateSrcDoc } from '@/lib/runner';
import RepoPreview from './RepoPreview';
import { gsap } from 'gsap';
import { usePostActions } from '@/hooks/usePostActions';
import PostActions from './PostActions';

// Supported languages for the runner
const RUNNER_LANGS = ['js', 'javascript', 'jsx', 'typescript', 'tsx', 'ts', 'html', 'css'];

// Client-side only Shery.js
let Shery;
if (typeof window !== 'undefined') {
  Shery = require('sheryjs');
}

const PostCard = ({ id, user, code, description, stats, date = 'Just now', allowComments = true, allowRemixes = true, theme = 'Cold Red', onRun, isFork, forkedFrom, onFork, onLike, onComment, onGoToPost, comments = [], isLiked, hideCommentsInline = false, isExpanded: initiallyExpanded = false, hideLikeAndCommentActions = false }) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [mounted, setMounted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showRunner, setShowRunner] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [buildStatus, setBuildStatus] = useState('Idle');
  const iframeRef = useRef(null);
  const menuRef = useRef(null);
  const { handleRunRecord, handleDelete } = usePostActions();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onDeleteClick = async (e) => {
    e.stopPropagation();
    if (confirm("Delete this snippet permanently?")) {
      handleDelete(id, { user: { name: 'Placeholder' } }); 
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);
  const cardRef = useRef(null);
  const runnerOverlayRef = useRef(null);
  const playBtnRef = useRef(null);
  const expandBtnRef = useRef(null);
  const buildTextRef = useRef(null);
  const langInfo = getLangInfo(code.filename);
  const themeStyles = getThemeStyles(theme);

  const lines = code?.content ? code.content.split('\n') : [];
  const isLongCode = lines.length > 16;
  const displayedContent = isExpanded ? (code?.content || '') : lines.slice(0, 16).join('\n');

  const handleToggleExpand = () => {
    if (isExpanded) {
      // If we are collapsing, scroll back to the top of the card
      const scrollPos = cardRef.current.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top: scrollPos, behavior: 'smooth' });
    }
    setIsExpanded(!isExpanded);
  };

  // Intelligent Description Highlighting
  const { githubUrl, formattedDescription, displayDescription } = useMemo(() => {
    const safeDesc = String(description || '');
    const combinedRegex = /(https?:\/\/github\.com\/[\w-]+\/[\w-]+)|(https?:\/\/[^\s]+)|(#[a-zA-Z0-9_]+)/g;
    const ghMatch = safeDesc.match(/(https?:\/\/github\.com\/[\w-]+\/[\w-]+)/);
    const url = ghMatch ? ghMatch[0] : null;

    const parts = safeDesc.split(combinedRegex);
    const formatted = [];

    let lastIndex = 0;
    const matches = Array.from(safeDesc.matchAll(combinedRegex));

    matches.forEach((m, i) => {
      const beforeMatch = safeDesc.substring(lastIndex, m.index);
      if (beforeMatch) formatted.push(<span key={`text-${i}`}>{beforeMatch}</span>);

      const matchText = m[0];
      if (matchText.startsWith('#')) {
        formatted.push(<span key={`tag-${i}`} className="text-(--accent) font-bold hover:underline cursor-pointer">{matchText}</span>);
      } else {
        formatted.push(<a key={`link-${i}`} href={matchText} target="_blank" rel="noopener noreferrer" className="text-[#58a6ff] hover:underline cursor-pointer font-medium">{matchText}</a>);
      }

      lastIndex = m.index + matchText.length;
    });

    const trailing = safeDesc.substring(lastIndex);
    if (trailing) formatted.push(<span key="trailing">{trailing}</span>);

    const descLines = safeDesc.split('\n');
    const isTruncated = descLines.length > 2;

    let displayDescription = formatted;
    if (!isExpanded && isTruncated) {
      displayDescription = (
        <>
          <span>{descLines.slice(0, 2).join('\n')}... </span>
          <button 
            onClick={(e) => { e.stopPropagation(); router.push(`/p/${id}`); }}
            className="text-(--accent) text-[11px] font-black uppercase tracking-widest hover:underline ml-1"
          >
            Read More
          </button>
        </>
      );
    }

    return { 
      githubUrl: url, 
      formattedDescription: formatted.length > 0 ? formatted : <span>{safeDesc}</span>,
      displayDescription,
      isTruncated
    };
  }, [description, isExpanded, router, id]);

  const ext = code.filename?.split('.').pop().toLowerCase() || 'js';

  const handleRun = () => {
    if (showRunner) {
      // Immediate button response
      setIsRunning(false);
      setBuildStatus('Idle');

      // Exit animation
      if (runnerOverlayRef.current) {
        gsap.to(runnerOverlayRef.current, {
          opacity: 0,
          scale: 0.95,
          filter: 'blur(10px)',
          duration: 0.5,
          ease: 'expo.inOut',
          onComplete: () => {
            setShowRunner(false);
          }
        });
      }
      return;
    }

    const isSupported = (filename) => {
      const extension = filename?.split('.').pop().toLowerCase();
      return RUNNER_LANGS.includes(extension) || RUNNER_LANGS.includes(code.language?.toLowerCase());
    };

    if (!isSupported(code.filename)) return;

    if (!showRunner) {
        handleRunRecord(id);
    }

    setIsRunning(true);
    setBuildStatus('Initializing Environment...');

    setTimeout(() => {
      setShowRunner(true);
      setTimeout(() => setBuildStatus('Parsing Logic...'), 200);
      setTimeout(() => setBuildStatus(ext === 'jsx' || ext === 'tsx' ? 'Babel Transpiling...' : 'TS Engine Loading...'), 600);
      setTimeout(() => {
        setIsRunning(false);
        setBuildStatus('Success');
      }, 1200);
    }, 100);
  };

  // Re-enable visibility when closing 
  useEffect(() => {
    if (!showRunner && mounted) {
      const codeArea = cardRef.current.querySelector('.code-content-inner');
      const repoArea = cardRef.current.querySelector('.repo-preview-container');
      if (codeArea) gsap.set(codeArea, { opacity: 1, filter: 'blur(0px)', scale: 1, y: 0, visibility: 'visible' });
      if (repoArea) gsap.set(repoArea, { opacity: 1, filter: 'blur(0px)', scale: 1, y: 0, visibility: 'visible' });
    }
  }, [showRunner, mounted]);

  // Entrance Liquid Animation
  useEffect(() => {
    if (showRunner && runnerOverlayRef.current) {
      // Sync Melt with Entrance
      const codeArea = cardRef.current.querySelector('.code-content-inner');
      const repoArea = cardRef.current.querySelector('.repo-preview-container');
      if (codeArea) gsap.to(codeArea, { opacity: 0, filter: 'blur(30px)', scale: 0.9, duration: 0.4 });
      if (repoArea) gsap.to(repoArea, { opacity: 0, filter: 'blur(30px)', scale: 0.8, duration: 0.4 });

      gsap.fromTo(runnerOverlayRef.current,
        {
          opacity: 0,
          clipPath: 'circle(0% at 50% 50%)',
          scale: 0.8,
          filter: 'blur(20px)'
        },
        {
          opacity: 1,
          clipPath: 'circle(250% at 50% 50%)', // Mega-reveal for big screens
          scale: 1,
          filter: 'blur(0px)',
          duration: 1.5, // Slower, more organic feel
          ease: 'expo.out'
        }
      );
    }
  }, [showRunner]);

  useEffect(() => {
    if (mounted && Shery) {
      try {
        Shery.makeMagnet('.magnet-btn', {
          ease: "cubic-bezier(0.23, 1, 0.320, 1)",
          duration: 1,
        });

        if (isRunning && buildTextRef.current) {
          Shery.textAnimate(buildTextRef.current, {
            style: 1,
            duration: 1,
            ease: "cubic-bezier(0.23, 1, 0.320, 1)",
          });
        }
      } catch (err) { /* Silent fail */ }
    }
  }, [mounted, isRunning, showRunner]);

  const srcDoc = useMemo(() => generateSrcDoc(code.content, code.filename), [code.content, code.filename]);

  return (
    <div ref={cardRef} className="w-full py-2 group/card border-b border-(--border)/30 last:border-0 transition-colors bg-(--card) hover:bg-(--card-hover)" style={themeStyles}>
      <div className="bg-transparent flex flex-col">

        {/* Header */}
        <div className="h-12 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-(--border)/30">
              <img
                src={user.avatar || "/dev_avatar.png"}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 cursor-pointer">
                <span className="text-(--foreground) text-[13px] hover:text-(--accent) transition-colors font-semibold">
                  {user.isMe ? 'you' : user.username}
                </span>
                {user.isVerified && <RiCheckboxCircleFill className="text-blue-500" size={13} />}
                {user.isDeveloper && <RiShieldStarFill className="text-amber-500" size={13} />}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-(--muted) uppercase tracking-widest font-medium">
                  {user.isDeveloper ? 'SHERIFF' : (user.title || 'Developer')}
                </span>
                {isFork && forkedFrom && (
                  <>
                    <span className="w-0.5 h-0.5 rounded-full bg-(--muted)/30" />
                    <span 
                      onClick={(e) => { e.stopPropagation(); router.push(`/p/${forkedFrom.id}`); }}
                      className="text-[9px] text-(--muted) font-medium cursor-pointer group/remix hover:text-(--foreground) transition-colors"
                    >
                      Remixed from <span className="text-(--accent)/80 group-hover/remix:underline font-bold">
                        {forkedFrom.isMe ? 'you' : `@${forkedFrom.username}`}
                      </span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="relative" ref={menuRef}>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className={`p-2 rounded-full transition-all active:scale-90 ${showMenu ? 'bg-white/10 text-white' : 'text-(--muted) hover:text-(--foreground) hover:bg-white/5'}`}
            >
              <MoreHorizontal size={18} />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-zinc-900/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl z-50 p-2 py-3 overflow-hidden">
                <div className="px-3 py-1 border-b border-white/5 mb-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-(--muted) opacity-50 block mb-1">Permissions</span>
                  <div className="flex flex-col gap-1 bottom-1">
                    <div className="flex items-center gap-2">
                       <div className={`w-1 h-1 rounded-full ${allowComments ? 'bg-emerald-500' : 'bg-red-500'}`} />
                       <span className={`text-[10px] font-bold uppercase tracking-widest ${allowComments ? 'text-white/60' : 'text-red-400/80'}`}>{allowComments ? 'Comments On' : 'Comments Off'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className={`w-1 h-1 rounded-full ${allowRemixes ? 'bg-emerald-500' : 'bg-red-500'}`} />
                       <span className={`text-[10px] font-bold uppercase tracking-widest ${allowRemixes ? 'text-white/60' : 'text-red-400/80'}`}>{allowRemixes ? 'Remixes On' : 'Remixes Off'}</span>
                    </div>
                  </div>
                </div>

                {isFork && forkedFrom && (
                  <div 
                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); router.push(`/p/${forkedFrom.id}`); }}
                    className="px-3 py-2 border-b border-white/5 mb-2 hover:bg-white/5 transition-colors cursor-pointer group/origin"
                  >
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-(--muted) opacity-50 block mb-1.5">Origin</span>
                    <div className="flex items-center gap-2 mb-1">
                       <span className="text-[10px] bg-(--accent) text-black px-1.5 py-0.5 rounded-sm font-black italic">PROGENITOR</span>
                       <span className="text-[11px] font-bold text-white/90">@{forkedFrom.username}</span>
                    </div>
                    <p className="text-[10px] text-(--muted) leading-relaxed line-clamp-2 italic group-hover/origin:text-white/60 transition-colors">
                       {forkedFrom.description || "No available descriptor found in the logs."}
                    </p>
                  </div>
                )}

                <div className="space-y-0.5">
                   {user.isMe && (
                     <button 
                       onClick={onDeleteClick}
                       className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-red-500/10 text-red-400/80 hover:text-red-500 rounded-xl transition-all"
                     >
                       <X size={14} />
                       <span className="text-[11px] font-black uppercase tracking-wider italic">Delete Post</span>
                     </button>
                   )}
                   <button className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-white/5 text-white/40 hover:text-white/80 rounded-xl transition-all">
                      <Terminal size={14} />
                      <span className="text-[11px] font-black uppercase tracking-wider italic">View Source JSON</span>
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Code Content Area */}
        <div className="relative bg-(--snippet-bg) overflow-hidden flex flex-col border-t border-white/5">
          <div className={`p-6 pt-10 min-h-[30vh] ${(!isExpanded && isLongCode) ? 'max-h-[400px]' : ''} overflow-hidden relative code-content-inner`}>
            <div className="flex gap-4">
              <div className="hidden sm:block text-(--snippet-line) text-right select-none font-mono text-[11px] pt-1 leading-6">
                {(isExpanded ? lines : lines.slice(0, 16)).map((_, i) => (
                  <div key={i} className="h-6">{i + 1}</div>
                ))}
              </div>
              <div className="text-(--snippet-text) font-mono text-[13px] leading-6 flex-1 overflow-x-auto scrollbar-hide">
                {highlightCode(displayedContent, code.filename)}
              </div>
            </div>

            {!isExpanded && isLongCode && (
              <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-(--snippet-bg) to-transparent pointer-events-none" />
            )}
          </div>

          {/* Independent Repo Preview Component */}
          <RepoPreview url={githubUrl} />

          {/* Refined Minimalist Apple-style Chip for Expand */}
          {isLongCode && !showRunner && (
            <button
              onClick={handleToggleExpand}
              className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-[10px] font-bold uppercase tracking-widest text-white/70 hover:text-white transition-all z-10 backdrop-blur-xl shadow-xl hover:-translate-y-0.5 active:scale-95 group/btn"
              style={{ bottom: githubUrl ? 'calc(20vh + 24px)' : '24px' }}
            >
              <span className="relative z-10">{isExpanded ? 'Collapse' : 'Expand full code'}</span>
              <ChevronDown size={12} strokeWidth={3} className={`relative z-10 transition-transform duration-500 group-hover/btn:translate-y-0.5 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          )}

          {showRunner && (
            <div
              ref={runnerOverlayRef}
              className="absolute inset-0 z-20 bg-[#020202] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/2 backdrop-blur-3xl">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`} />
                  <span ref={buildTextRef} className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                    {isRunning ? buildStatus : (code?.content?.includes('<') ? 'Live UI Mode' : 'Developer Console')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onRun && onRun({ id, content: code.content, filename: code.filename, srcDoc })}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
                  >
                    <Maximize2 size={14} />
                  </button>
                  <button
                    onClick={() => {
                      gsap.to(runnerOverlayRef.current, {
                        y: '100%',
                        opacity: 0,
                        duration: 0.4,
                        onComplete: () => setShowRunner(false)
                      });
                    }}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="flex-1 relative overflow-hidden bg-black/50">
                {isRunning ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-30 bg-black">
                    <Loader2 size={32} className="text-(--accent) animate-spin opacity-50" />
                    <span className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase animate-pulse">{buildStatus}</span>
                  </div>
                ) : (
                  <iframe
                    ref={iframeRef}
                    srcDoc={srcDoc}
                    className="w-full h-full border-0 bg-transparent animate-in fade-in duration-700"
                    sandbox="allow-scripts"
                  />
                )}
              </div>

              <div className="px-6 py-2 border-t border-white/5 bg-white/2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[8px] font-bold text-white/10 uppercase tracking-[0.2em]">
                  <Terminal size={10} />
                  Output Interceptor Live
                </div>
              </div>
            </div>
          )}

          {/* Theme Watermark */}
          {!isLongCode && (
            <div className={`absolute right-5 text-[9px] font-medium text-(--foreground)/5 uppercase tracking-[0.3em] select-none transition-all ${githubUrl ? 'bottom-[calc(20vh+12px)]' : 'bottom-4'}`}>
              {theme} Style
            </div>
          )}
        </div>

        <PostActions 
          id={id}
          stats={stats}
          isLiked={isLiked}
          onLike={onLike}
          onComment={onComment}
          onFork={onFork}
          onRun={handleRun}
          allowComments={allowComments}
          allowRemixes={allowRemixes}
          showRunner={showRunner}
          isRunning={isRunning}
          isSupported={RUNNER_LANGS.includes(code.filename?.split('.').pop()?.toLowerCase() || '') || RUNNER_LANGS.includes(code.language?.toLowerCase() || '')}
          user={user}
          code={code}
          description={description}
          theme={theme}
          hideLikeAndCommentActions={hideLikeAndCommentActions}
          showComments={showComments}
          onCommentClick={(e) => {
             e.stopPropagation();
             if (!allowComments) {
                 toast.error("Comments disabled", { style: { background: '#111', color: '#fff', fontSize: '12px' } });
                 return;
             }
             if (onComment) onComment(id, null, allowComments);
             else router.push(`/p/${id}`);
          }}
        />


        {/* Stats & Description Footer */}
        <div className="px-4 pb-4 flex flex-col gap-2.5">
          <div className="text-[14px] leading-normal text-(--foreground)">
            <span className="font-semibold text-(--accent) mr-2 cursor-pointer hover:underline underline-offset-2">
              {user.isMe ? 'you' : user.username}
            </span>
            <span className="text-(--foreground)/90">{displayDescription}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-(--foreground) text-[13px] font-semibold">{stats?.runs || 0} runs</span>
            <div className="flex items-center gap-2.5 text-[9px] text-(--muted) tracking-widest uppercase font-semibold">
              <div className="flex items-center gap-1 opacity-70">
                {langInfo.icon}
                <span>{langInfo.label}</span>
              </div>
              <span className="w-0.5 h-0.5 rounded-full bg-(--border)" />
              <span className="text-(--muted) font-normal">{date}</span>
            </div>
          </div>
        </div>

        {/* Comment Section */}
        {showComments && !hideCommentsInline && (
          <div className="border-t border-white/5 bg-white/2 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] uppercase font-bold text-zinc-500 overflow-hidden shrink-0">
                <img src="/dev_avatar.png" className="w-full h-full object-cover" alt="avatar" />
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && commentText.trim()) {
                      onComment(id, commentText);
                      setCommentText('');
                    }
                  }}
                  placeholder="Add a comment..."
                  className="flex-1 bg-black border border-white/5 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-(--accent)/50 transition-all placeholder:text-zinc-600 outline-none"
                />
                <button
                  onClick={() => {
                    if (commentText.trim()) {
                      onComment(id, commentText);
                      setCommentText('');
                    }
                  }}
                  className="bg-(--accent)/10 text-(--accent) px-4 rounded-xl hover:bg-(--accent) hover:text-white transition-all active:scale-95"
                >
                  Post
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto scrollbar-hide pr-2">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 group/comment">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] uppercase font-bold text-zinc-500 overflow-hidden shrink-0">
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-(--muted)">
                      {comment.user[0]}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-(--foreground)">{comment.user}</span>
                      <span className="text-[10px] text-(--muted)">{comment.date}</span>
                    </div>
                    <p className="text-sm text-(--foreground)/80 leading-relaxed">{comment.text}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <button className="text-[10px] font-black uppercase tracking-widest text-(--muted) hover:text-(--accent) transition-colors">Reply</button>
                      <button className="text-[10px] font-black uppercase tracking-widest text-(--muted) hover:text-white transition-colors">Like</button>
                    </div>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <div className="py-8 text-center text-(--muted) text-[11px] font-bold uppercase tracking-widest opacity-20">
                  No comments yet. Start the conversation.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostCard;