import React from 'react'
import PostCard from './PostCard'

const Feed = ({ posts = [], onRun, onFork, onLike, onDislike, onComment, onGoToPost }) => {

  return (
    <div className="w-full flex flex-col border-x border-(--border)/50 bg-transparent">
      {/* Post List */}
      <div className="flex flex-col">
        {posts.map(post => (
          <PostCard 
            key={post.id} 
            {...post} 
            onRun={onRun} 
            onFork={onFork} 
            onLike={onLike}
            onDislike={onDislike}
            onComment={onComment}
            onGoToPost={onGoToPost}
          />
        ))}
      </div>

      {/* Catchy Interaction Line */}
      <div className="p-16 text-center flex flex-col items-center gap-4 border-t border-(--border)/30">
        <div className="w-10 h-px bg-(--border) opacity-50 rounded-full" />
        <p className="text-(--muted) text-[14px] font-medium max-w-[280px] leading-relaxed">
          You've reached the digital horizon. <br />
          <span className="text-(--foreground) font-bold">Feeling inspired?</span> Share your next masterpiece.
        </p>
        <button className="mt-2 text-(--accent) text-[11px] font-black uppercase tracking-widest hover:underline underline-offset-4">
           Back to top
        </button>
      </div>
    </div>
  )
}

export default Feed
