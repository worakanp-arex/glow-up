import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Send, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as postService from "../../services/postService.js";
import PostCard from "../../components/community/PostCard.jsx";
import "./PostDetail.css";

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
      <div className="post-detail-comment-header">
        <span className="post-detail-comment-avatar">
          {comment.user?.avatarUrl ? <img src={comment.user.avatarUrl} alt="" /> : initials(comment.user?.name)}
        </span>
        <p className="post-detail-comment-author">{comment.user?.name}</p>
        {!editing && (canEdit || canDelete) && (
          <div className="post-detail-comment-actions">
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
        <form className="post-detail-comment-edit-form" onSubmit={handleSave}>
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

function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    postService
      .getPost(id)
      .then(setPost)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleLike() {
    const updated = await postService.likePost(id);
    setPost((prev) => ({ ...prev, likes: updated.likes, likedByMe: updated.likedByMe }));
  }

  async function handlePostUpdated(postId, payload) {
    const updated = await postService.updatePost(postId, payload);
    setPost((prev) => ({ ...prev, ...updated, comments: prev.comments }));
  }

  async function handlePostDeleted() {
    await postService.deletePost(id);
    navigate("/community");
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const comment = await postService.addComment(id, commentText);
      setPost((prev) => ({ ...prev, comments: [...prev.comments, comment] }));
      setCommentText("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveComment(commentId, content) {
    const updated = await postService.updateComment(id, commentId, content);
    setPost((prev) => ({
      ...prev,
      comments: prev.comments.map((c) => (c._id === commentId ? updated : c)),
    }));
  }

  async function handleDeleteComment(commentId) {
    if (!window.confirm("ลบความคิดเห็นนี้?")) return;
    await postService.deleteComment(id, commentId);
    setPost((prev) => ({ ...prev, comments: prev.comments.filter((c) => c._id !== commentId) }));
  }

  if (loading) {
    return <div className="post-detail-page">กำลังโหลด...</div>;
  }
  if (!post) {
    return <div className="post-detail-page">ไม่พบโพสต์นี้</div>;
  }

  const isPostOwner = post.user?._id === user._id;

  return (
    <div className="post-detail-page">
      <Link to="/community" className="post-detail-back">
        <ArrowLeft size={16} />
        กลับไปหน้าชุมชน
      </Link>

      <ul className="post-detail-post-wrapper">
        <PostCard
          post={{ ...post, commentCount: post.comments.length }}
          currentUserId={user._id}
          onLike={handleLike}
          onUpdated={handlePostUpdated}
          onDeleted={handlePostDeleted}
          linkToDetail={false}
        />
      </ul>

      <section className="post-detail-comments">
        <h2>ความคิดเห็น ({post.comments.length})</h2>
        <ul>
          {post.comments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              canEdit={comment.user?._id === user._id}
              canDelete={comment.user?._id === user._id || isPostOwner}
              onSave={handleSaveComment}
              onDelete={handleDeleteComment}
            />
          ))}
        </ul>

        {user.role === "user" && (
          <form onSubmit={handleAddComment} className="post-detail-comment-form">
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

export default PostDetail;
