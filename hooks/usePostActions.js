import { mutate } from 'swr';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export function usePostActions(primaryKey = '/api/posts') {
  const router = useRouter();

  const handleLike = async (postId, session) => {
    if (!session?.user) return router.push('/login');

    const toggleLikeState = (current) => {
      if (!current) return current;
      const updatePost = (p) => p.id === postId 
        ? { ...p, stats: { ...p.stats, likes: p.stats.likes + (p.isLiked ? -1 : 1) }, isLiked: !p.isLiked }
        : (p.forks ? { ...p, forks: p.forks.map(updatePost) } : p);

      if (current.posts) return { ...current, posts: current.posts.map(updatePost) };
      if (current.id === postId || (current.forks && current.forks.some(f => f.id === postId))) {
        return updatePost(current);
      }
      return current;
    };

    mutate((key) => typeof key === 'string' && key.startsWith('/api/posts'), toggleLikeState, false);
    mutate('/api/profile', toggleLikeState, false);

    try {
        const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
        if (!res.ok) throw new Error("Failed to like");
        toast.success("Post Liked", { style: { background: '#111', color: '#fff', fontSize: '12px' } });
    } catch(err) {
        toast.error("Failed to connect");
    }
    
    mutate((key) => typeof key === 'string' && key.startsWith('/api/posts'));
    mutate('/api/profile');
  };

  const handleFork = (post, session, setForkingPost, setIsModalOpen) => {
    if (!session?.user) return router.push('/login');
    
    if (post.allowRemixes === false) {
        toast.error("Author disabled remixes for this post");
        return;
    }

    setForkingPost({
      id: post.id,
      username: post.user?.username || 'unknown',
      code: post.code?.content || post.code,
      language: post.code?.language || post.language || 'javascript',
      description: post.description,
      theme: post.theme?.toLowerCase().includes('red') ? 'red' : post.theme?.toLowerCase() || 'dark',
      allowComments: post.allowComments !== undefined ? post.allowComments : true,
      allowRemixes: post.allowRemixes !== undefined ? post.allowRemixes : true
    });
    setIsModalOpen(true);
    toast("Creating Remix...", { style: { background: '#111', color: '#fff', fontSize: '12px' }});
  };

  const handleComment = async (postId, text, session, allowComments = true) => {
    if (!session?.user) return router.push('/login');
    
    if (!allowComments) {
        toast.error("Comments are disabled for this post");
        return;
    }

    if (!text?.trim()) {
        toast("Opening comments...", { style: { background: '#111', color: '#fff', fontSize: '12px' }});
        router.push(`/p/${postId}`);
        return;
    }

    const incrementComments = (current) => {
      if (!current) return current;
      const updatePost = (p) => p.id === postId 
        ? { ...p, stats: { ...p.stats, comments: (p.stats.comments || 0) + 1 } } 
        : (p.forks ? { ...p, forks: p.forks.map(updatePost) } : p);

      if (current.posts) return { ...current, posts: current.posts.map(updatePost) };
      if (current.id === postId || (current.forks && current.forks.some(f => f.id === postId))) {
        return updatePost(current);
      }
      return current;
    };

    mutate((key) => typeof key === 'string' && key.startsWith('/api/posts'), incrementComments, false);
    mutate('/api/profile', incrementComments, false);
    mutate(`/api/posts/${postId}`, (curr) => curr ? { ...curr, stats: { ...curr.stats, comments: (curr.stats.comments || 0) + 1 } } : null, false);

    try {
        const res = await fetch(`/api/posts/${postId}/comment`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ text })
        });
        if (!res.ok) throw new Error("Failed to post comment");
        toast.success("Comment Posted", { style: { background: '#111', color: '#fff', fontSize: '12px' } });
    } catch(err) {
        toast.error("Failed to post comment");
    }
    
    mutate((key) => typeof key === 'string' && key.startsWith('/api/posts'));
    mutate('/api/profile');
    mutate(`/api/posts/${postId}`);
  };

  const handleRunRecord = async (postId) => {
    const incrementRuns = (current) => {
      if (!current) return current;
      const updatePost = (p) => p.id === postId 
        ? { ...p, stats: { ...p.stats, runs: (p.stats.runs || 0) + 1 } } 
        : (p.forks ? { ...p, forks: p.forks.map(updatePost) } : p);

      if (current.posts) return { ...current, posts: current.posts.map(updatePost) };
      if (current.id === postId || (current.forks && current.forks.some(f => f.id === postId))) {
        return updatePost(current);
      }
      return current;
    };

    mutate((key) => typeof key === 'string' && key.startsWith('/api/posts'), incrementRuns, false);
    mutate('/api/profile', incrementRuns, false);

    await fetch(`/api/posts/${postId}/run`, { method: 'POST' });
  };

  const handleAddPost = async (newPostData, session, forkingPost, setIsModalOpen, setForkingPost) => {
    if (!session?.user?.id) return router.push('/login');

    const loadingToast = toast.loading("Publishing post...");

    const tempId = Date.now().toString();
    const optimisticPost = {
      id: tempId,
      user: { username: session.user.name, title: session.user.title || 'Developer', avatar: session.user.image, isMe: true },
      date: 'Just now',
      theme: newPostData.theme === 'red' ? 'Cold Red' : newPostData.theme.toUpperCase(),
      code: {
        filename: `snippet.${newPostData.language === 'javascript' ? 'js' : newPostData.language}`,
        content: newPostData.code,
        language: newPostData.language
      },
      description: newPostData.description,
      stats: { likes: 0, comments: 0, forks: 0, runs: 0 },
      isLiked: false,
      isFork: !!forkingPost,
      forkedFrom: forkingPost ? { username: forkingPost.username, id: forkingPost.id, isMe: session.user.name === forkingPost.username } : null,
      allowComments: newPostData.allowComments !== undefined ? newPostData.allowComments : true,
      allowRemixes: newPostData.allowRemixes !== undefined ? newPostData.allowRemixes : true,
      comments: []
    };

    const injectOptimistic = (current) => {
      if (!current) return { posts: [optimisticPost] };
      return { ...current, posts: [optimisticPost, ...(current.posts || [])] };
    };

    mutate((key) => typeof key === 'string' && key.startsWith('/api/posts'), injectOptimistic, false);
    mutate('/api/profile', injectOptimistic, false);

    setIsModalOpen(false);
    if(setForkingPost) setForkingPost(null);

    try {
        const res = await fetch('/api/posts/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             code: newPostData.code,
             language: newPostData.language,
             filename: `snippet.${newPostData.language === 'javascript' ? 'js' : newPostData.language}`,
             description: newPostData.description,
             theme: newPostData.theme,
             isFork: !!forkingPost,
             forkedFromId: forkingPost?.id || null,
             allowComments: newPostData.allowComments !== undefined ? newPostData.allowComments : true,
             allowRemixes: newPostData.allowRemixes !== undefined ? newPostData.allowRemixes : true
          })
        });

        if (!res.ok) throw new Error("Failed to post");
        toast.success("Success: Post Published", { id: loadingToast });
    } catch (err) {
        toast.error("Failed to post", { id: loadingToast });
    }

    mutate((key) => typeof key === 'string' && key.startsWith('/api/posts')); 
    mutate('/api/profile');
    if (primaryKey !== '/api/posts' && primaryKey !== '/api/profile') {
        router.push('/');
    }
  };

  const handleDelete = async (postId, session) => {
    if (!session?.user) return router.push('/login');

    const removePost = (current) => {
      if (!current) return current;
      if (current.posts) return { ...current, posts: current.posts.filter(p => p.id !== postId) };
      if (current.id === postId) return null;
      return current;
    };

    mutate((key) => typeof key === 'string' && key.startsWith('/api/posts'), removePost, false);
    mutate('/api/profile', removePost, false);

    try {
        const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error("Delete failed");
        toast.success("Post Deleted");
    } catch(err) {
        toast.error("Failed to delete post");
    }
    
    mutate((key) => typeof key === 'string' && key.startsWith('/api/posts'));
    mutate('/api/profile');
  };

  return { handleLike, handleFork, handleComment, handleRunRecord, handleAddPost, handleDelete };
}
