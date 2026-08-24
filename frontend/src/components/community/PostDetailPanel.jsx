import { useEffect, useState } from "react";
import { Lock, Pencil, Send, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as postService from "../../services/postService.js";
import PostCard from "./PostCard.jsx";
import "./PostDetailPanel.css";

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

function CommentItem({ comment, canEdit, canDelete, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.content || "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(comment._id, text);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li>
      <div className="post-detail-panel-comment-header">
        <span className="post-detail-panel-comment-avatar">
          {comment.user?.avatarUrl ? <img src={comment.user.avatarUrl} alt="" /> : initials(comment.user?.name)}
        </span>
        <p className="post-detail-panel-comment-author">{comment.user?.name}</p>
        {!editing && (canEdit || canDelete) && (
          <div className="post-detail-panel-comment-actions">
            {canEdit && (
              <button type="button" onClick={() => setEditing(true)} aria-label="แก้ไขความคิดเห็น">
                <Pencil size={13} />
              </button>
            )}
            {canDelete && (
              <button type="button" onClick={() => onDelete(comment._id)} aria-label="ลบความคิดเห็น">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <form className="post-detail-panel-comment-edit-form" onSubmit={handleSave}>
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} required />
          <button type="submit" className="btn btn-primary" disabled={saving}>
            บันทึก
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
            ยกเลิก
          </button>
        </form>
      ) : (
        <p>{comment.content}</p>
      )}
    </li>
  );
}

// Shared by the standalone /community/:id page and Community.jsx's inline
// master-detail panel — `onChange` reports post-level patches (likes, saves,
// comment count, edits) so an embedding list can stay in sync; `onDeleted`
// lets each embedding decide what "gone" means (navigate away vs. clear selection).
function PostDetailPanel({ postId, onChange, onDeleted }) {
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setPost(null);
    postService
      .getPost(postId)
      .then(setPost)
      .finally(() => setLoading(false));
  }, [postId]);

  async function handleLike() {
    const updated = await postService.likePost(postId);
    setPost((prev) => ({ ...prev, likes: updated.likes, likedByMe: updated.likedByMe }));
    onChange?.({ likes: updated.likes, likedByMe: updated.likedByMe });
  }

  async function handleToggleSave() {
    const { savedByMe } = await postService.toggleSavePost(postId);
    setPost((prev) => ({ ...prev, savedByMe }));
    onChange?.({ savedByMe });
  }

  async function handlePostUpdated(id, payload) {
    const updated = await postService.updatePost(id, payload);
    setPost((prev) => ({ ...prev, ...updated, comments: prev.comments }));
    onChange?.({ content: updated.content, tags: updated.tags, commentsEnabled: updated.commentsEnabled });
  }

  async function handlePostDeleted() {
    await postService.deletePost(postId);
    onDeleted?.();
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const comment = await postService.addComment(postId, commentText);
      setPost((prev) => {
        const comments = [...prev.comments, comment];
        onChange?.({ commentCount: comments.length });
        return { ...prev, comments };
      });
      setCommentText("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveComment(commentId, content) {
    const updated = await postService.updateComment(postId, commentId, content);
    setPost((prev) => ({
      ...prev,
      comments: prev.comments.map((c) => (c._id === commentId ? updated : c)),
    }));
  }

  async function handleDeleteComment(commentId) {
    if (!window.confirm("ลบความคิดเห็นนี้?")) return;
    await postService.deleteComment(postId, commentId);
    setPost((prev) => {
      const comments = prev.comments.filter((c) => c._id !== commentId);
      onChange?.({ commentCount: comments.length });
      return { ...prev, comments };
    });
  }

  if (loading) {
    return <div className="post-detail-panel-loading">กำลังโหลด...</div>;
  }
  if (!post) {
    return <div className="post-detail-panel-loading">ไม่พบโพสต์นี้</div>;
  }

  const isPostOwner = post.user?._id === user._id;

  return (
    <div className="post-detail-panel">
      <ul className="post-detail-panel-post-wrapper">
        <PostCard
          post={{ ...post, commentCount: post.comments.length }}
          currentUserId={user._id}
          onLike={handleLike}
          onToggleSave={handleToggleSave}
          onUpdated={handlePostUpdated}
          onDeleted={handlePostDeleted}
          linkToDetail={false}
        />
      </ul>

      <section className="post-detail-panel-comments">
        <h2>ความคิดเห็น ({post.comments.length})</h2>
        <ul>
          {post.comments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              canEdit={comment.user?._id === user._id}
              canDelete={comment.user?._id === user._id || isPostOwner || user.role === "admin"}
              onSave={handleSaveComment}
              onDelete={handleDeleteComment}
            />
          ))}
        </ul>

        {post.commentsEnabled === false ? (
          <p className="post-detail-panel-comments-closed">
            <Lock size={14} />
            <span>โพสต์นี้ปิดการแสดงความคิดเห็น</span>
          </p>
        ) : (
          <form onSubmit={handleAddComment} className="post-detail-panel-comment-form">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="แสดงความคิดเห็น..."
            />
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Send size={15} />
              <span>ส่ง</span>
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

export default PostDetailPanel;
