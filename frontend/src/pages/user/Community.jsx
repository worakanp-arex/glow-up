import PageHeader from "../../components/common/PageHeader.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import { usePagination } from "../../hooks/usePagination.js";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useRef, useState } from "react";
import { useMobileLayout } from "../../hooks/useMobileLayout.js";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Users, Send } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as postService from "../../services/postService.js";
import PostCard from "../../components/community/PostCard.jsx";
import PostDetailPanel from "../../components/community/PostDetailPanel.jsx";
import { AUDIENCE_ROLES } from "../../constants/postAudience.js";
import "./Community.css";

const STAFF_ROLES = ["counsellor", "admin"];

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

function Community() {
  const mobile = useMobileLayout();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = STAFF_ROLES.includes(user.role);
  const [searchParams, setSearchParams] = useSearchParams();
  // Saved posts live on this page as a tab (?tab=saved) so switching keeps the
  // same layout and detail panel instead of jumping to another page.
  const tab = !isStaff && searchParams.get("tab") === "saved" ? "saved" : "all";
  const [posts, setPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState(null);
  const [savedError, setSavedError] = useState(null);
  const [savedReload, setSavedReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const visiblePosts = tab === "saved" ? savedPosts ?? [] : posts;
  const pagination = usePagination(visiblePosts);
  const [loadError, setLoadError] = useState(null);
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [visibleToRoles, setVisibleToRoles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const textareaRef = useRef(null);
  const detailRef = useRef(null);

  useEffect(() => {
    if (detailRef.current) detailRef.current.scrollTop = 0;
  }, [selectedPostId]);

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

  useEffect(() => {
    if (tab !== "saved") return;
    let cancelled = false;
    setSavedError(null);
    postService
      .getSavedPosts()
      .then((data) => {
        if (cancelled) return;
        setSavedPosts(data);
        setSelectedPostId((prev) => (data.some((p) => p._id === prev) ? prev : data[0]?._id ?? null));
      })
      .catch((error) => !cancelled && setSavedError(error));
    return () => { cancelled = true; };
  }, [tab, savedReload]);

  function switchTab(next) {
    if (next === tab) return;
    if (next === "all") setSelectedPostId(posts[0]?._id ?? null);
    else setSavedPosts(null);
    setSearchParams(next === "saved" ? { tab: "saved" } : {}, { replace: true });
  }

  function patchPost(postId, patch) {
    setPosts((prev) => prev.map((p) => (p._id === postId ? { ...p, ...patch } : p)));
    setSavedPosts((prev) => {
      if (!prev) return prev;
      if (patch.savedByMe === false) {
        const remaining = prev.filter((p) => p._id !== postId);
        if (tab === "saved") setSelectedPostId((sel) => (sel === postId ? remaining[0]?._id ?? null : sel));
        return remaining;
      }
      return prev.map((p) => (p._id === postId ? { ...p, ...patch } : p));
    });
  }

  function removePost(postId) {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
    setSavedPosts((prev) => prev && prev.filter((p) => p._id !== postId));
  }

  function focusComposer() {
    textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    textareaRef.current?.focus();
  }

  function toggleAudienceRole(role) {
    setVisibleToRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
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
      const post = await postService.createPost({ content, tags, commentsEnabled, visibleToRoles });
      setPosts((prev) => [post, ...prev]);
      setContent("");
      setTagsInput("");
      setCommentsEnabled(true);
      setVisibleToRoles([]);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLike(postId, liked) {
    const updated = await postService.likePost(postId, liked);
    patchPost(postId, updated);
    return updated;
  }

  async function handleToggleSave(postId) {
    const { savedByMe } = await postService.toggleSavePost(postId);
    patchPost(postId, { savedByMe });
  }

  async function handleUpdated(postId, payload) {
    const updated = await postService.updatePost(postId, payload);
    patchPost(postId, updated);
  }

  async function handleDeleted(postId) {
    await postService.deletePost(postId);
    removePost(postId);
  }

  function handlePanelChange(postId, patch) {
    patchPost(postId, patch);
  }

  function handlePanelDeleted(postId) {
    const remaining = visiblePosts.filter((p) => p._id !== postId);
    removePost(postId);
    setSelectedPostId(remaining[0]?._id ?? null);
  }

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  if (loading) {
    return <div className="community-page"><AsyncState /></div>;
  }

  return (
    <div className="community-page">
      <PageHeader icon={Users} description={<>
            สาระความรู้และคำแนะนำจากบุคลากรทางการแพทย์ เพื่อสนับสนุนเส้นทางการฟื้นฟูของคุณ
          </>} actions={isStaff && (
          <button type="button" className="btn btn-primary" onClick={focusComposer}>
            <Send size={16} />
            <span>เขียนโพสต์ให้ความรู้</span>
          </button>
        )}>ชุมชนฟื้นฟู</PageHeader>

      <div className="community-tabs" role={isStaff ? undefined : "tablist"}>
        {isStaff ? (
          <>
            <span className="active">ทั้งหมด</span>
            <Link to="/community/mine">โพสต์ของฉัน</Link>
          </>
        ) : (
          <>
            <button type="button" role="tab" aria-selected={tab === "all"} className={tab === "all" ? "active" : ""} onClick={() => switchTab("all")}>ทั้งหมด</button>
            <button type="button" role="tab" aria-selected={tab === "saved"} className={tab === "saved" ? "active" : ""} onClick={() => switchTab("saved")}>โพสต์ที่บันทึกไว้</button>
          </>
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
                onSelect={id => mobile ? navigate(`/community/${id}`) : setSelectedPostId(id)}
                selected={post._id === selectedPostId}
              />
            )
          )}
          {tab === "all" && posts.length === 0 && <p className="community-empty">ยังไม่มีโพสต์ในชุมชน</p>}
          {tab === "saved" && (savedError ? (
            <AsyncState error description={savedError.response?.data?.message} onRetry={() => setSavedReload((n) => n + 1)} />
          ) : savedPosts === null ? (
            <AsyncState />
          ) : savedPosts.length === 0 && (
            <p className="community-empty">คุณยังไม่ได้บันทึกโพสต์ไว้</p>
          ))}
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

              <div className="community-composer-audience">
                <span className="community-composer-audience-label">ใครเห็นโพสต์นี้ได้บ้าง</span>
                <label className="community-composer-toggle">
                  <input type="checkbox" checked={visibleToRoles.length === 0} onChange={() => setVisibleToRoles([])} />
                  <span>ทุกคน</span>
                </label>
                {AUDIENCE_ROLES.map(({ value, label }) => (
                  <label key={value} className="community-composer-toggle">
                    <input
                      type="checkbox"
                      checked={visibleToRoles.includes(value)}
                      onChange={() => toggleAudienceRole(value)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <button type="submit" disabled={submitting}>
                {submitting ? "กำลังโพสต์..." : "โพสต์"}
              </button>
            </form>
          </aside>
        ) : !mobile && (
          <aside className="community-sidebar" ref={detailRef}>
            {selectedPostId && visiblePosts.some(p => p._id === selectedPostId) ? (
              <PostDetailPanel
                key={selectedPostId}
                postId={selectedPostId}
                reaction={visiblePosts.find(p => p._id === selectedPostId)}
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
