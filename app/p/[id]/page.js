'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import useSWR from 'swr';
import Sidebar from '@/components/Sidebar';
import PostCard from '@/components/PostCard';
import CreatePostModal from '@/components/CreatePostModal';
import CodeRunner from '@/components/CodeRunner';
import { MessageSquareCode, GitBranchPlus } from 'lucide-react';
import { RiRepeatLine } from 'react-icons/ri';
import { usePostActions } from '@/hooks/usePostActions';

const fetcher = url => fetch(url).then(res => res.json())

const PostDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSWR('/api/auth/session', fetcher, { revalidateOnFocus: false });
  const { data: post, mutate, isValidating } = useSWR(`/api/posts/${id}`, fetcher, {
     revalidateOnFocus: false,
     revalidateOnReconnect: false,
     refreshInterval: 0,
     dedupingInterval: 60000 
  });

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');
  const [commentText, setCommentText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [forkingPost, setForkingPost] = useState(null);
  const [visibleCount, setVisibleCount] = useState(5);
  const [runCode, setRunCode] = useState(null);
  const { handleLike: globalLike, handleDislike: globalDislike, handleFork: globalFork, handleComment: globalComment } = usePostActions(`/api/posts/${id}`);

  useEffect(() => {
    setMounted(true);
    if (post?.description) {
       const summary = post.description.split('\n')[0].slice(0, 40);
       document.title = `${summary} | ColdCode Explorer`;
    } else {
       document.title = "Post Explorer | ColdCode";
    }
  }, [post]);



  const handleAddComment = async () => {
    if (!session?.user) return router.push('/login');
    if (!commentText.trim()) return;

    const newComment = {
      id: Date.now(),
      user: { username: session.user.name, avatar: session.user.image },
      text: commentText,
      date: 'Just now'
    };

    mutate(current => {
       if(!current) return current;
       return {
          ...current,
          stats: { ...current.stats, comments: current.stats.comments + 1 },
          comments: [newComment, ...current.comments]
       }
    }, false);

    setCommentText('');
    await fetch(`/api/posts/${id}/comment`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText }) 
    });
    mutate(); // re-sync true remote ID logic
  };

  const handleFork = (p) => {
    if (!session?.user) return router.push('/login');
    setForkingPost({
      id: p.id,
      username: p.user?.username || 'unknown',
      code: p.code?.content || p.code,
      language: p.code?.language || p.language || 'javascript',
      description: p.description,
      theme: p.theme?.toLowerCase().includes('red') ? 'red' : p.theme?.toLowerCase() || 'dark'
    });
    setIsModalOpen(true);
  };

  const handleAddPost = async (newPostData) => {
    if (!session?.user?.id) return router.push('/login');
    setIsModalOpen(false);
    setForkingPost(null);

    await fetch('/api/posts/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
         code: newPostData.code,
         language: newPostData.language,
         filename: `snippet.${newPostData.language === 'javascript' ? 'js' : newPostData.language}`,
         description: newPostData.description,
         theme: newPostData.theme,
         isFork: !!forkingPost,
         forkedFromId: forkingPost?.id || null
      })
    });
    
    // Redirect home to see new fork
    router.push('/');
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-(--background) transition-colors duration-500 flex justify-center">
      <Sidebar 
        onPostClick={() => {
           if (!session?.user) return router.push('/login');
           setForkingPost(null);
           setIsModalOpen(true);
        }} 
        theme="dark" 
        session={session}
      />

      <main className="lg:w-[45%] min-h-screen border-r border-l border-(--border)/50 bg-(--background) relative">
        <div className="sticky top-0 z-40 bg-(--background)/80 backdrop-blur-3xl border-b border-(--border)/50 h-14 flex items-center px-6 gap-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-(--card-hover) rounded-full transition-all active:scale-90 text-(--foreground)"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h2 className="text-lg font-black text-(--foreground) tracking-tight uppercase">Inspector</h2>
            <span className="text-[10px] text-(--muted) font-bold tracking-[0.2em] uppercase">Deep Dive Artifact</span>
          </div>
        </div>

        {isValidating && !post && (
           <div className="py-20 flex justify-center opacity-30">
              <span className="text-[11px] font-black uppercase tracking-widest text-(--muted) animate-pulse">Syncing Node...</span>
           </div>
        )}

        {post && post.error ? (
           <div className="py-20 flex justify-center flex-col items-center">
              <span className="text-3xl font-black uppercase tracking-widest text-(--accent)">404</span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-(--muted) mt-4">Node Terminated</span>
           </div>
        ) : post && (
          <div className="pb-32">
            <PostCard 
              {...post} 
              isLiked={post.isLiked}
              isDisliked={post.isDisliked}
              onLike={() => globalLike(post.id, session)} 
              onDislike={() => globalDislike(post.id, session)}
              onFork={() => globalFork(post, session, setForkingPost, setIsModalOpen)} 
              onRun={setRunCode}
              hideCommentsInline={true}
              hideLikeAndCommentActions={false} 
              isExpanded={true}
            />

            <div className="flex px-6 mt-8 mb-6 border-b border-(--border)/30">
              <button 
                onClick={() => setActiveTab('comments')}
                className={`pb-4 text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all relative ${activeTab === 'comments' ? 'text-(--foreground)' : 'text-(--muted) hover:text-(--foreground)/80'}`}
              >
                 <MessageSquareCode size={14} /> Comments
                 {activeTab === 'comments' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-(--accent)" />}
               </button>
               <button 
                 onClick={() => setActiveTab('forks')}
                 className={`pb-4 text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all relative ml-8 ${activeTab === 'forks' ? 'text-(--foreground)' : 'text-(--muted) hover:text-(--foreground)/80'}`}
               >
                 <GitBranchPlus size={14} /> Remixes
                 {activeTab === 'forks' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-(--accent)" />}
               </button>
            </div>

            {activeTab === 'comments' && (
              <div className="px-6 space-y-6">
                {post.allowComments ? (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-900 border border-white/10 shrink-0">
                      <img src={session?.user?.image || "/dev_avatar.png"} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="bg-(--card) border border-(--border)/50 rounded-2xl p-2 relative group focus-within:border-white/20 transition-colors">
                      <textarea 
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={session?.user ? "Trace your thoughts..." : "Sign in to compile comments..."}
                        disabled={!session?.user}
                        className="w-full bg-transparent text-sm text-(--foreground) placeholder:text-(--muted) resize-none outline-none min-h-[40px] px-2 py-1 leading-relaxed"
                      />
                    </div>
                    {session?.user && (
                      <button 
                        onClick={handleAddComment}
                        disabled={!commentText.trim()}
                        className="self-end px-6 py-2 bg-white text-black font-black uppercase text-[10px] tracking-[0.2em] rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                      >
                        Comment
                      </button>
                    )}
                  </div>
                </div>
                ) : (
                  <div className="py-6 px-4 bg-zinc-900/40 border border-white/5 rounded-2xl flex items-center justify-center gap-3">
                     <span className="text-[9px] font-black uppercase tracking-[0.3em] text-(--muted) opacity-50 italic">Author has disabled trace logs on this run</span>
                  </div>
                )}

                <div className="space-y-6 mt-8">
                  {post.comments?.slice(0, visibleCount).map((comment) => (
                    <div key={comment.id} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-(--border)/50">
                        <img src={comment.user.avatar || "/dev_avatar.png"} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-(--foreground)">{comment.user.isMe ? 'you' : comment.user.username}</span>
                          {comment.user.username === post.user?.username && (
                             <span className="text-[8px] px-1.5 py-0.5 rounded-sm bg-(--accent)/20 text-(--accent) uppercase tracking-widest font-black">Author</span>
                          )}
                          <span className="text-xs text-(--muted)">• {comment.date}</span>
                        </div>
                        <p className="text-sm text-(--foreground)/90 leading-relaxed font-medium whitespace-pre-wrap">{comment.text}</p>
                      </div>
                    </div>
                  ))}

                  {post.comments?.length > visibleCount && (
                     <button 
                         onClick={() => setVisibleCount(c => c + 10)}
                         className="w-full py-3 bg-(--card) hover:bg-(--card-hover) border border-(--border)/30 text-[10px] font-black uppercase tracking-[0.2em] text-(--foreground) hover:text-(--accent) transition-all rounded-xl mt-4"
                     >
                         Load More
                     </button>
                  )}

                  {post.comments?.length === 0 && (
                     <div className="py-20 flex justify-center opacity-30">
                        <span className="text-[10px] font-black uppercase tracking-widest text-(--muted)">Awaiting Trace Logs</span>
                     </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'forks' && (
              <div className="px-6 space-y-4">
                  {post.forks?.map((fork) => (
                    <PostCard 
                       key={fork.id} 
                       {...fork} 
                       onLike={() => globalLike(fork.id, session)}
                       onDislike={() => globalDislike(fork.id, session)}
                       onFork={(p) => globalFork(p, session, setForkingPost, setIsModalOpen)}
                       onComment={(id, text, allow) => globalComment(id || fork.id, session, allow ?? fork.allowComments)}
                       onRun={setRunCode}
                       hideCommentsInline={true}
                       hideLikeAndCommentActions={false} 
                       isExpanded={false}
                    />
                 ))}
                {post.forks?.length === 0 && (
                    <div className="py-20 flex justify-center opacity-30">
                       <span className="text-[10px] font-black uppercase tracking-widest text-(--muted)">0 Remix Branches</span>
                    </div>
                 )}
              </div>
            )}
          </div>
        )}
      </main>

      <CreatePostModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onPost={handleAddPost}
        initialData={forkingPost}
      />
      
      {runCode && (
        <CodeRunner 
          isOpen={!!runCode} 
          onClose={() => setRunCode(null)} 
          code={runCode.content || runCode} 
          filename={runCode.filename} 
          srcDoc={runCode.srcDoc} 
        />
      )}
    </div>
  );
};

export default PostDetailPage;
