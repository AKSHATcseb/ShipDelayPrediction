import React, { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Send, Trash, AtSign } from 'lucide-react';

function CommentsSection({ projectId, activityId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyToId, setReplyToId] = useState(null);
  const { user } = useAuth();
  const socket = useSocket();

  const fetchComments = async () => {
    try {
      const res = await api.get(`/comments/project/${projectId}${activityId ? `?activityId=${activityId}` : ''}`);
      setComments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [projectId, activityId]);

  useEffect(() => {
    if (!socket) return;

    socket.on('comment-added', (comment) => {
      if (comment.projectId === projectId && (activityId ? comment.activityId === activityId : !comment.activityId)) {
        setComments((prev) => {
          if (prev.some(c => c._id === comment._id)) return prev;
          return [...prev, comment];
        });
      }
    });

    socket.on('comment-deleted', ({ commentId }) => {
      setComments((prev) =>
        prev.map((c) =>
          c._id === commentId
            ? { ...c, isDeleted: true, content: 'This comment was deleted.' }
            : c
        )
      );
    });

    return () => {
      socket.off('comment-added');
      socket.off('comment-deleted');
    };
  }, [socket, projectId, activityId]);

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await api.post('/comments', {
        projectId,
        activityId: activityId || null,
        content: newComment,
        parentId: replyToId
      });
      setNewComment('');
      setReplyToId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (id) => {
    try {
      await api.delete(`/comments/${id}?projectId=${projectId}`);
    } catch (err) {
      console.error(err);
    }
  };

  const renderCommentText = (text) => {
    const parts = text.split(/(@[a-zA-Z0-9._-]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-[#2F6690] font-bold bg-[#E8EFF5] px-1 py-0.5 rounded text-[10px]">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const rootComments = comments.filter(c => !c.parentId);
  const getReplies = (parentId) => comments.filter(c => c.parentId === parentId);

  return (
    <div className="bg-white border border-[#D6DEE8] p-5 rounded-2xl flex flex-col h-[400px] shadow-sm">
      <h4 className="text-xs font-black text-[#12355B] uppercase tracking-wider border-b border-[#D6DEE8] pb-3">
        Discussion Thread
      </h4>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {rootComments.length === 0 ? (
          <div className="text-center text-slate-400 text-xs py-12 italic">
            No comments yet. Mention someone using @name to loop them in.
          </div>
        ) : (
          rootComments.map((comment) => {
            const replies = getReplies(comment._id);

            return (
              <div key={comment._id} className="space-y-3">
                {/* Root Comment */}
                <div className="flex gap-3 items-start group">
                  <div className="h-6 w-6 rounded-full bg-[#E8EFF5] border border-[#D6DEE8] text-[#12355B] font-black text-[9px] flex items-center justify-center font-outfit uppercase">
                    {comment.userId?.name?.substring(0, 2) || 'U'}
                  </div>
                  <div className="flex-1 bg-slate-50 border border-[#D6DEE8]/60 p-3 rounded-xl relative">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] font-black text-slate-800">{comment.userId?.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] text-slate-400 font-bold">
                          {new Date(comment.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!comment.isDeleted && (comment.userId?._id === user?.id || user?.role === 'PROJECT_MANAGER') && (
                          <button 
                            onClick={() => handleDeleteComment(comment._id)}
                            className="text-slate-400 hover:text-[#C62828] p-0.5 rounded transition-all opacity-0 group-hover:opacity-100"
                            title="Delete comment"
                          >
                            <Trash size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                      {renderCommentText(comment.content)}
                    </p>
                    
                    {!comment.isDeleted && (
                      <button 
                        onClick={() => setReplyToId(comment._id)}
                        className="text-[9px] font-bold text-[#2F6690] hover:underline mt-1.5 block text-left"
                      >
                        Reply
                      </button>
                    )}
                  </div>
                </div>

                {/* Nested Replies */}
                {replies.map((reply) => (
                  <div key={reply._id} className="flex gap-3 items-start pl-9 group">
                    <div className="h-5 w-5 rounded-full bg-[#F0F4F8] border border-[#D6DEE8] text-[#2F6690] font-black text-[8px] flex items-center justify-center font-outfit uppercase">
                      {reply.userId?.name?.substring(0, 2) || 'R'}
                    </div>
                    <div className="flex-1 bg-[#F7F9FC] border border-[#D6DEE8]/40 p-2.5 rounded-lg relative">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-[9px] font-black text-slate-800">{reply.userId?.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] text-slate-400 font-bold">
                            {new Date(reply.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {!reply.isDeleted && (reply.userId?._id === user?.id || reply.userId === user?.id || user?.role === 'PROJECT_MANAGER') && (
                            <button 
                              onClick={() => handleDeleteComment(reply._id)}
                              className="text-slate-400 hover:text-[#C62828] p-0.5 rounded transition-all opacity-0 group-hover:opacity-100"
                              title="Delete reply"
                            >
                              <Trash size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                        {renderCommentText(reply.content)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSendComment} className="border-t border-[#D6DEE8] pt-3">
        {replyToId && (
          <div className="flex justify-between items-center mb-2 px-3 py-1 bg-slate-50 border border-[#D6DEE8] rounded text-[9px] text-[#2F6690] font-bold">
            <span>Replying to {comments.find(c => c._id === replyToId)?.userId?.name}</span>
            <button onClick={() => setReplyToId(null)} className="text-[#C62828] hover:underline">Cancel</button>
          </div>
        )}
        <div className="flex gap-2">
          <input 
            type="text" 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyToId ? "Write a reply..." : "Write a comment... use @Username to mention"}
            className="flex-1 px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#12355B] font-semibold"
          />
          <button 
            type="submit"
            className="p-2 bg-[#12355B] hover:bg-[#0E2A47] text-white rounded-lg transition-all flex items-center justify-center"
          >
            <Send size={12} />
          </button>
        </div>
      </form>
    </div>
  );
}

export default CommentsSection;
