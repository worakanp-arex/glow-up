import Pagination from "../../components/common/Pagination.jsx";
import { usePagination } from "../../hooks/usePagination.js";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as postService from "../../services/postService.js";
import PostCard from "../../components/community/PostCard.jsx";
import PostDetailPanel from "../../components/community/PostDetailPanel.jsx";
import "./Community.css";

const STAFF_ROLES = ["counsellor", "admin"];

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

function Community() {
  const { user } = useAuth();
  const isStaff = STAFF_ROLES.includes(user.role);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const pagination = usePagination(posts);
  const [loadError, setLoadError] = useState(null);
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    postService
      .getPosts()
      .then((data) => {
        setPosts(data);
        setSelectedPostId((prev) => prev ?? data[0]?._id ?? null);
      })
      .catch((error) => setLoadError(error))
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
      const post = await postService.createPost({ content, tags, commentsEnabled });
      setPosts((prev) => [post, ...prev]);
      setContent("");
      setTagsInput("");
      setCommentsEnabled(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLike(postId) {
    const updated = await postService.likePost(postId);
    setPosts((prev) => prev.map((p) => (p._id === postId ? { ...p, ...updated } : p)));
  }

  async function handleToggleSave(postId) {
    const { savedByMe } = await postService.toggleSavePost(postId);
    setPosts((prev) => prev.map((p) => (p._id === postId ? { ...p, savedByMe } : p)));
  }

  async function handleUpdated(postId, payload) {
    const updated = await postService.updatePost(postId, payload);
    setPosts((prev) => prev.map((p) => (p._id === postId ? updated : p)));
  }

  async function handleDeleted(postId) {
    await postService.deletePost(postId);
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  }

  function handlePanelChange(postId, patch) {
    setPosts((prev) => prev.map((p) => (p._id === postId ? { ...p, ...patch } : p)));
  }

  function handlePanelDeleted(postId) {
    setPosts((prev) => {
      const remaining = prev.filter((p) => p._id !== postId);
      setSelectedPostId(remaining[0]?._id ?? null);
      return remaining;
    });
  }

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  if (loading) {
    return <div className="community-page"><AsyncState /></div>;
  }

  return (
    <div className="community-page">
      <div className="community-header">
        <div>
          <h1>ชุมชนฟื้นฟู</h1>
          <p className="community-subtitle">
            สาระความรู้และคำแนะนำจากบุคลากรทางการแพทย์ เพื่อสนับสนุนเส้นทางการฟื้นฟูของคุณ
          </p>
        </div>
        {isStaff && (
          <button type="button" onClick={focusComposer}>
            <Send size={16} />
            <span>เขียนโพสต์ให้ความรู้</span>
          </button>
        )}
      </div>

      <div className="community-tabs">
        <span className="active">ทั้งหมด</span>
        {isStaff ? (
          <Link to="/community/mine">โพสต์ของฉัน</Link>
        ) : (
          <Link to="/community/saved">โพสต์ที่บันทึกไว้</Link>
        )}
      </div>

      <div className="community-layout">
        <ul className="community-list">
          {pagination.items.map((post) =>
            isStaff ? (
              <PostCard
                key={post._id}
                post={post}
                currentUserId={user._id}
                onLike={handleLike}
                onToggleSave={handleToggleSave}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
              />
            ) : (
              <PostCard
                key={post._id}
                post={post}
                currentUserId={user._id}
                onLike={handleLike}
                onToggleSave={handleToggleSave}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
                onSelect={setSelectedPostId}
                selected={post._id === selectedPostId}
              />
            )
          )}
          {posts.length === 0 && <p className="community-empty">ยังไม่มีโพสต์ในชุมชน</p>}
        </ul>

        {isStaff ? (
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
                placeholder="แบ่งปันความรู้ คำแนะนำ หรือกำลังใจสำหรับผู้ผ่านการบำบัด..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                required
              />
              <input
                type="text"
                placeholder="แท็ก คั่นด้วยจุลภาค เช่น ความรู้, กำลังใจ"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
              <label className="community-composer-toggle">
                <input
                  type="checkbox"
                  checked={commentsEnabled}
                  onChange={(e) => setCommentsEnabled(e.target.checked)}
                />
                <span>เปิดให้แสดงความคิดเห็น</span>
              </label>
              <button type="submit" disabled={submitting}>
                {submitting ? "กำลังโพสต์..." : "โพสต์"}
              </button>
            </form>
          </aside>
        ) : (
          <aside className="community-sidebar community-detail-sidebar">
            {selectedPostId ? (
              <PostDetailPanel
                postId={selectedPostId}
                onChange={(patch) => handlePanelChange(selectedPostId, patch)}
                onDeleted={() => handlePanelDeleted(selectedPostId)}
              />
            ) : (
              <p className="community-detail-empty">เลือกโพสต์เพื่อดูรายละเอียด</p>
            )}
          </aside>
        )}
      </div>
      <Pagination {...pagination} />
    </div>
  );
}

export default Community;
