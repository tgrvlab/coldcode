import { formatDistanceToNow } from "date-fns"

export function formatPost(p, session, userLikes = new Set()) {
  const isMe = session?.user?.id === p.authorId || session?.user?.username === p.user?.username || session?.user?.name === p.user?.username;

  return {
    ...p,
    id: p.id,
    isLiked: userLikes.has(p.id),
    user: { 
      ...p.user, 
      isMe 
    },
    code: { 
      content: p.code, 
      filename: p.filename, 
      language: p.language 
    },
    date: p.createdAt ? formatDistanceToNow(new Date(p.createdAt), { addSuffix: true }) : 'Just now',
    allowComments: p.allowComments ?? true,
    allowRemixes: p.allowRemixes ?? true,
    stats: { 
      likes: p.likesCount || 0, 
      comments: p.commentsCount || 0, 
      forks: p.remixesCount || 0,
      runs: p.runsCount || 0 
    },
    forkedFrom: p.forkedFromId ? (p.forkedFrom || { 
      id: p.forkedFromId, 
      username: p.parentAuthorUsername || 'developer', 
      description: p.parentDescription, 
      isMe: session?.user?.name === (p.parentAuthorUsername || 'developer') 
    }) : null,
  };
}
