'use client';
import { useState } from 'react';
import useSWR from 'swr';
import Feed from './Feed';
import CreatePostModal from './CreatePostModal';
import CodeRunner from './CodeRunner';
import { usePostActions } from '@/hooks/usePostActions';

const fetcher = url => fetch(url).then(res => res.json());

export default function ProfileFeedClient({ initialPosts, session }) {
   const { data } = useSWR('/api/profile', fetcher, { 
       fallbackData: { posts: initialPosts },
       revalidateOnFocus: false
   });
   
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [forkingPost, setForkingPost] = useState(null);
   const [runCode, setRunCode] = useState(null);
   const { handleLike, handleDislike, handleFork, handleComment, handleRunRecord, handleAddPost } = usePostActions('/api/profile');

   return (
      <div className="w-full flex justify-center pb-20">
         {data?.posts?.length > 0 ? (
           <Feed 
              posts={data.posts} 
              onLike={(id) => handleLike(id, session)}
              onDislike={(id) => handleDislike(id, session)}
              onFork={(post) => handleFork(post, session, setForkingPost, setIsModalOpen)}
               onComment={(id, text, allow) => handleComment(id, text, session, allow)}
              onRun={setRunCode}
           />
         ) : (
           <span className="text-[10px] font-black uppercase tracking-[0.5em] text-(--muted) opacity-50 py-20">Telemetry Connected - No Activity</span>
         )}

         <CreatePostModal 
            isOpen={isModalOpen} 
            onClose={() => { setIsModalOpen(false); setForkingPost(null); }} 
            onPost={(postData) => handleAddPost(postData, session, forkingPost, setIsModalOpen, setForkingPost)}
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
}
