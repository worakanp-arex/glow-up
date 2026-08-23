import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as postService from "../../services/postService.js";
import PostCard from "../../components/community/PostCard.jsx";
import "./Community.css";

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    postService
      .getPosts()
      .then(setPosts)
      .finally(() => setLoading(false));
  }, []);

  function focusComposer() {
    textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    textareaRef.current?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const post = await postService.createPost({ content, tags });
      setPosts((prev) => [post, ...prev]);
      setContent("");
      setTagsInput("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLike(postId) {
    const updated = await postService.likePost(postId);
    setPosts((prev) => prev.map((p) => (p._id === postId ? { ...p, ...updated } : p)));
  }

  async function handleUpdated(postId, payload) {
    const updated = await postService.updatePost(postId, payload);
    setPosts((prev) => prev.map((p) => (p._id === postId ? updated : p)));
  }

  async function handleDeleted(postId) {
    await postService.deletePost(postId);
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  }

  if (loading) {
    return <div className="community-page">กำลังโหลด...</div>;
  }

  return (
    <div className="community-page">
      <div className="community-header">
        <div>
          <h1>ชุมชนเพื่อนช่วยเพื่อน (Peer Support)</h1>
          <p className="community-subtitle">
            พื้นที่ปลอดภัย ปราศจากตราบาป ร่วมแบ่งปันหมุดหมายฟื้นฟู ประสบการณ์การทำงาน และกำลังใจรายวัน
          </p>
        </div>
        {user.role === "user" && (
          <button type="button" onClick={focusComposer}>
            <Send size={16} />
            <span>โพสต์แบ่งปันเรื่องราว</span>
          </button>
        )}
      </div>

      {user.role === "user" && (
        <div className="community-tabs">
          <span className="active">ทั้งหมด</span>
          <Link to="/community/mine">โพสต์ของฉัน</Link>
        </div>
      )}

      <div className="community-layout">
        <ul className="community-list">
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              currentUserId={user._id}
              onLike={handleLike}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
          {posts.length === 0 && <p className="community-empty">ยังไม่มีโพสต์ในชุมชน</p>}
        </ul>

        {user.role === "user" && (
          <aside className="community-sidebar">
            <form className="community-composer" onSubmit={handleSubmit}>
              <div className="community-composer-header">
                <span className="community-composer-avatar">
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user.name)}
                </span>
                <span>{user.name}</span>
              </div>
              <textarea
                ref={textareaRef}
                placeholder="แบ่งปันเรื่องราว ความสำเร็จ หรือให้กำลังใจเพื่อน..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                required
              />
              <input
                type="text"
                placeholder="แท็ก คั่นด้วยจุลภาค เช่น กำลังใจ, หางาน"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
              <button type="submit" disabled={submitting}>
                {submitting ? "กำลังโพสต์..." : "โพสต์"}
              </button>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}

export default Community;
