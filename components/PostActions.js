'use client';

import React from 'react';
import { RiThumbUpLine, RiThumbUpFill, RiGitBranchLine } from 'react-icons/ri';
import { MessageSquareCode, PlayCircle, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function PostActions({ 
  id, 
  stats, 
  isLiked, 
  onLike, 
  onComment, 
  onFork, 
  onRun, 
  allowComments, 
  allowRemixes, 
  showRunner, 
  isRunning,
  isSupported,
  user,
  code,
  description,
  theme,
  hideLikeAndCommentActions,
  showComments,
  onCommentClick
}) {
  return (
    <div className="px-4 py-2 flex items-center justify-between mt-1 border-t border-white/5">
      {!hideLikeAndCommentActions ? (
        <div className="flex items-center gap-6">
          <button
            onClick={(e) => { e.stopPropagation(); onLike && onLike(id); }}
            className={`flex items-center transition-all hover:scale-110 active:scale-90 ${isLiked ? 'text-(--accent)' : 'text-(--foreground) hover:text-(--accent)'}`}
          >
            {isLiked ? <RiThumbUpFill size={19} /> : <RiThumbUpLine size={19} />}
            <span className={`text-xs ml-1.5 font-bold tracking-tight ${isLiked ? 'text-(--accent)' : 'text-(--foreground)/40'}`}>{stats?.likes || 0}</span>
          </button>
          
          <button
            disabled={!allowComments}
            onClick={(e) => {
              e.stopPropagation();
              if (onCommentClick) {
                 onCommentClick(e);
                 return;
              }
              if (!allowComments) {
                  toast.error("Comments disabled", {
                      style: { background: '#111', color: '#fff', fontSize: '12px' }
                  });
                  return;
              }
              if (onComment) onComment(id, null, allowComments);
            }}
            className={`flex items-center transition-all ${!allowComments ? 'opacity-30 cursor-not-allowed text-(--foreground)/40' : (showComments ? 'text-(--accent) hover:scale-110 active:scale-90' : 'text-(--foreground) hover:text-(--accent) hover:scale-110 active:scale-90')}`}
          >
            <MessageSquareCode size={18} />
            <span className={`text-xs ml-1.5 font-bold tracking-tight ${!allowComments ? 'text-(--foreground)/40' : (showComments ? 'text-(--accent)' : 'text-(--foreground)/40')}`}>{stats?.comments || 0}</span>
          </button>

        <button
          disabled={!allowRemixes}
          onClick={(e) => { 
            e.stopPropagation(); 
            if (!allowRemixes) {
                toast.error("Remixes disabled", {
                    style: { background: '#111', color: '#fff', fontSize: '12px' }
                });
                return;
            }
            if (onFork) onFork({ id, user, code, description, theme, allowRemixes }); 
          }}
          className={`flex items-center transition-all ${!allowRemixes ? 'opacity-30 cursor-not-allowed text-(--foreground)/40' : 'text-(--foreground) hover:text-(--accent) hover:scale-110 active:scale-90'}`}
        >
          <RiGitBranchLine size={18} />
          <span className="text-xs ml-1.5 font-bold tracking-tight text-(--foreground)/40">{stats?.forks || 0}</span>
        </button>
        </div>
      ) : <div />}

      {isSupported && (
        <button
           onClick={(e) => { e.stopPropagation(); onRun && onRun(); }}
           className={`flex items-center gap-2 px-6 py-2 rounded-full font-black text-[10px] tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(255,70,85,0.15)] ${showRunner || isRunning ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-(--accent) text-black hover:shadow-red-500/20 active:scale-95'}`}
        >
          {isRunning ? <Loader2 size={14} className="animate-spin" /> : (showRunner ? <X size={14} /> : <PlayCircle size={14} />)}
          {isRunning ? 'RUNNING' : (showRunner ? 'STOP' : 'RUN')}
        </button>
      )}
    </div>
  );
}
