import React, { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { MessageSquare, Calendar, User, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

function ReviewsPage() {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCommentsFeed = async () => {
    try {
      const projectsRes = await api.get('/auth/projects');
      const allProjects = projectsRes.data;

      const compiledComments = [];
      for (const p of allProjects) {
        try {
          const commentsRes = await api.get(`/comments/project/${p._id}`);
          commentsRes.data.forEach(c => {
            compiledComments.push({
              ...c,
              projectCode: p.projectIdCode,
              projectName: p.projectName,
              projectId: p._id
            });
          });
        } catch (e) {
          console.error(`Failed to fetch comments for project ${p._id}`, e);
        }
      }
      // Sort comments by date descending
      compiledComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setComments(compiledComments);
    } catch (err) {
      console.error('Failed to compile comments feed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommentsFeed();
  }, []);

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await api.delete(`/comments/${commentId}`);
      fetchCommentsFeed();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto bg-[#F7F9FC] flex flex-col min-h-0 engineering-grid">
      <div>
        <h1 className="text-xl font-black text-[#12355B] tracking-wide font-outfit uppercase">
          {user.role === 'PROJECT_MANAGER' ? 'Viewer Comments & Reviews' : 'Reviews & Suggestions Feed'}
        </h1>
        <p className="text-xs text-slate-500 font-semibold mt-0.5">
          {user.role === 'PROJECT_MANAGER' 
            ? 'Review and respond to feedback, suggestions, and remarks submitted by observers.' 
            : 'Track comments, suggestions, and responses posted across all active acquisition programs.'}
        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="h-8 w-8 border-4 border-[#12355B] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#D6DEE8] rounded-2xl bg-white shadow-sm">
          <MessageSquare className="mx-auto text-slate-400 mb-3" size={32} />
          <p className="text-xs font-bold text-slate-500 font-outfit">No comments or suggestions found.</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-4xl">
          {comments.map((comment) => (
            <div key={comment._id} className="bg-white border border-[#D6DEE8] p-5 rounded-2xl relative group shadow-sm card-lift">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[8px] font-black text-[#12355B] bg-[#E8EFF5] px-1.5 py-0.5 rounded border border-[#D6DEE8] uppercase tracking-widest">{comment.projectCode}</span>
                    <span className="text-[10px] text-[#12355B] font-extrabold">{comment.projectName}</span>
                  </div>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed">{comment.content}</p>
                </div>
                
                {user.role === 'PROJECT_MANAGER' && !comment.isDeleted && (
                  <button 
                    onClick={() => handleDeleteComment(comment._id)}
                    className="text-slate-400 hover:text-[#C62828] p-1.5 rounded transition-all opacity-0 group-hover:opacity-100"
                    title="Delete Comment"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 text-[10px] text-slate-500 font-semibold mt-4 border-t border-slate-100 pt-3">
                <span className="flex items-center gap-1">
                  <User size={11} className="text-[#2F6690]" />
                  {comment.userId?.name} ({comment.userId?.email})
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {new Date(comment.createdAt).toLocaleDateString('en-GB')} {new Date(comment.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReviewsPage;
