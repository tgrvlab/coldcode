'use client';

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import Feed from '@/components/Feed'
import CreatePostModal from '@/components/CreatePostModal'
import CodeRunner from '@/components/CodeRunner'
import Sidebar from '@/components/Sidebar'
import { usePostActions } from '@/hooks/usePostActions'
import { gsap } from 'gsap'
import { mergeThreads } from '@/utils/merge'

const fetcher = url => fetch(url).then(res => res.json())

const Main = () => {
  const router = useRouter();
  const [limit, setLimit] = useState(10);
  const { data: session } = useSWR('/api/auth/session', fetcher, {
    revalidateOnFocus: false
  });
  const { data, mutate, isValidating } = useSWR(`/api/posts?limit=${limit}`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 0,
    dedupingInterval: 60000 
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [theme, setThemeState] = useState('dark');
  const [runCode, setRunCode] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [forkingPost, setForkingPost] = useState(null);
  const loadMoreRef = useRef(null);
  const { handleLike, handleDislike, handleFork, handleComment, handleAddPost: createPost } = usePostActions();

  useEffect(() => {
    setMounted(true);

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isValidating && data?.posts?.length >= limit) {
           setLimit(prev => prev + 10);
        }
    }, { threshold: 0.1 });

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    
    return () => {
        if (loadMoreRef.current) observer.unobserve(loadMoreRef.current);
    };
  }, [isValidating, data, limit]);
  
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleAddPost = (newPostData) => {
    createPost(newPostData, session, forkingPost, setIsModalOpen, setForkingPost);
  };

  const onFork = (post) => {
    handleFork(post, session, setForkingPost, setIsModalOpen);
  };

  const onLike = (postId) => {
    handleLike(postId, session);
  };

  const onDislike = (postId) => {
    handleDislike(postId, session);
  };

  const onComment = (postId, text, allowComments) => {
    handleComment(postId, text, session, allowComments);
  };

  const scrollToPost = (postId) => {
    const element = document.getElementById(`post-${postId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      gsap.fromTo(element, 
        { borderColor: 'rgb(255, 70, 85)' }, 
        { borderColor: 'rgba(17, 17, 17, 0.3)', duration: 2 }
      );
    }
  };

  if (!mounted) return null;

  const displayPosts = mergeThreads(data?.posts || []);

  return (
    <div className="min-h-screen bg-(--background) selection:bg-(--accent) selection:text-white transition-colors duration-500">
      <Sidebar 
        onPostClick={() => {
          if (!session?.user) return router.push('/login');
          setForkingPost(null);
          setIsModalOpen(true);
        }}
        theme={theme}
        toggleTheme={toggleTheme}
        session={session}
      />

      {/* Main Feed Container */}
      <main className="lg:ml-[20%] lg:mr-[35%] min-h-screen border-r border-(--border)/50 relative">
        <div className="max-w-[700px] mx-auto lg:mx-0 lg:w-full min-h-screen relative p-4 lg:p-0">
          
          {isValidating && displayPosts.length === 0 && (
             <div className="flex h-[30vh] items-center justify-center">
                <span className="text-(--muted) text-[11px] font-black uppercase tracking-widest animate-pulse">Synchronizing Node...</span>
             </div>
          )}
          
          {displayPosts.length > 0 && (
            <>
               <Feed 
                 posts={displayPosts} 
                 onRun={setRunCode} 
                 onFork={onFork} 
                 onLike={onLike} 
                 onDislike={onDislike}
                 onComment={onComment}
                 onGoToPost={scrollToPost}
               />
               <div ref={loadMoreRef} className="w-full flex justify-center py-10 relative">
                  {isValidating && (
                     <span className="text-[10px] font-black uppercase tracking-[0.5em] text-(--accent) animate-pulse">Syncing Network...</span>
                  )}
                  {!isValidating && data?.posts?.length >= limit && (
                     <button 
                        onClick={() => setLimit(l => l + 10)}
                        className="px-8 py-3 bg-white hover:bg-zinc-200 text-black font-black text-[10px] uppercase tracking-widest rounded-full transition-all group overflow-hidden relative opacity-0 inline-block pointer-events-none"
                     >
                        <span className="relative z-10 group-active:scale-95 transition-transform flex items-center justify-center gap-2">Expand Trace</span>
                     </button>
                  )}
               </div>
            </>
          )}

          {displayPosts.length === 0 && !isValidating && (
             <div className="flex h-[30vh] items-center justify-center flex-col opacity-40">
                <span className="text-(--muted) text-[11px] font-black uppercase tracking-[0.4em]">Node Idle</span>
                <span className="text-(--foreground) text-[9px] font-bold uppercase tracking-[0.2em] mt-2">Publish a snippet to spawn cluster</span>
             </div>
          )}
        </div>
      </main>

      {/* Sidebar Right */}
      <div className="fixed right-0 top-0 h-full w-[35%] hidden lg:flex flex-col px-8 py-12">
        <div className="bg-(--card) border border-(--border) rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-bold text-(--foreground) mb-6">Trending Snippets</h3>
          <div className="space-y-6">
            <div className="group cursor-pointer">
              <p className="text-(--muted) text-xs uppercase tracking-widest mb-1 font-bold">Trending in React</p>
              <p className="text-(--foreground) font-bold group-hover:text-(--accent) transition-colors">Server Actions Patterns</p>
              <p className="text-(--muted) text-sm font-medium">4.2k remixing</p>
            </div>
            <div className="group cursor-pointer">
              <p className="text-(--muted) text-xs uppercase tracking-widest mb-1 font-bold">Technology • Trending</p>
              <p className="text-(--foreground) font-bold group-hover:text-(--accent) transition-colors">#RustLang</p>
              <p className="text-(--muted) text-sm font-medium">12.8k posts</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 px-6 text-(--muted) text-xs flex flex-wrap gap-4 font-medium opacity-50">
          <span className="hover:text-(--foreground) cursor-pointer transition-colors">Terms of Service</span>
          <span className="hover:text-(--foreground) cursor-pointer transition-colors">Privacy Policy</span>
          <span className="hover:text-(--foreground) cursor-pointer transition-colors">Developer Ethics</span>
          <span>© 2026 Cold Code Inc.</span>
        </div>
      </div>

      <CreatePostModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setForkingPost(null);
        }} 
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

      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(var(--foreground)_1px,transparent_1px)] bg-size-[40px_40px]"></div>
      </div>
    </div>
  )
}

export default Main