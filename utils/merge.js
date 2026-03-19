/**
 * Merges raw flat posts array into a threaded structure,
 * correctly linking child remixes directly underneath their original stems.
 */
export function mergeThreads(posts) {
  if (!posts || !Array.isArray(posts)) return [];
  
  // Creates a fast lookup map for original posts
  const postMap = new Map();
  posts.forEach(p => {
    postMap.set(p.id, { ...p, remixChildren: [] });
  });

  const processedRoots = [];

  // Reconstruct the threads
  Array.from(postMap.values()).forEach(post => {
    if (post.isFork && post.forkedFromId && postMap.has(post.forkedFromId)) {
       const parentConfig = postMap.get(post.forkedFromId);
       
       // UI Enhancement: Hydrate parent natively based on local feed overlap rather than DB join
       post.forkedFrom = { 
           id: parentConfig.id, 
           username: parentConfig.user?.username || 'developer',
           isMe: parentConfig.user?.isMe || false 
       };
       
       // Append to the parent's children array for hierarchical tracing
       parentConfig.remixChildren.push(post);
    } 
    // Push everything to root to maintain chronologic social timeline
    processedRoots.push(postMap.get(post.id));
  });

  return processedRoots;
}
