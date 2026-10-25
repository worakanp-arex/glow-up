import PageHeader from "../../components/common/PageHeader.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import EditorDialog from "../../components/common/EditorDialog.jsx";
import useConfirmDialog from "../../components/common/useConfirmDialog.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ExternalLink, Flag, Pencil, ShieldAlert, Trash2 } from "lucide-react";
import * as postService from "../../services/postService.js";
import "./PostsModeration.css";

const PAGE_SIZE = 10;
const DATE_TIME = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function PostsModeration() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState("");
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ content: "", tagsInput: "", note: "" });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    postService
      .getFlaggedPostsPage({ page, limit: PAGE_SIZE }, controller.signal)
      .then(({ items, total: count }) => {
        if (controller.signal.aborted) return;
        setPosts(Array.isArray(items) ? items : []);
        setTotal(count);
      })
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function removeFromList(post) {
    setPosts((prev) => prev.filter((p) => p._id !== post._id));
    setTotal((count) => Math.max(0, count - 1));
  }

  async function handleClear(post) {
    setActionError("");
    try {
      await postService.unflagPost(post._id);
      removeFromList(post);
    } catch (err) {
      setActionError(err.response?.data?.message || "ดำเนินการไม่สำเร็จ");
    }
  }

  const { confirm, confirmDialog } = useConfirmDialog();

  function handleDelete(post) {
    confirm({
      title: "ลบโพสต์",
      message: "ต้องการลบโพสต์นี้ใช่ไหม? ผู้ที่รายงานและเจ้าของโพสต์จะได้รับแจ้ง การลบไม่สามารถย้อนกลับได้",
      confirmLabel: "ลบโพสต์",
      onConfirm: async () => {
        await postService.deletePost(post._id);
        removeFromList(post);
      },
    });
  }

  function startEdit(post) {
    setEditForm({ content: post.content || "", tagsInput: (post.tags || []).join(", "), note: "" });
    setEditing(post);
  }

  async function saveEdit() {
    await postService.moderatePost(editing._id, {
      content: editForm.content,
      tags: editForm.tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      note: editForm.note || undefined,
    });
    // Editing resolves the report: the post is shown again and the reporters are told.
    removeFromList(editing);
  }

  const header = (
    <PageHeader icon={ShieldAlert} eyebrow="Moderation" description={<>
      โพสต์ที่ผู้ใช้รายงานจะถูกซ่อนไว้ชั่วคราวจนกว่าจะตรวจสอบ ดูเหตุผลที่ถูกรายงาน แก้ไขเนื้อหา หรือคืนโพสต์ได้ และผู้รายงานจะได้รับแจ้งผลทุกครั้ง
    </>}>ตรวจสอบโพสต์ที่ถูกรายงาน</PageHeader>
  );

  if (loadError) return <div className="posts-moderation-page">{header}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  return (
    <div className="posts-moderation-page">
      {confirmDialog}
      {header}

      {actionError && <p className="posts-moderation-error" role="alert">{actionError}</p>}

      {loading ? <AsyncState /> : posts.length === 0 ? (
        <p className="posts-moderation-empty">ไม่มีโพสต์ที่รอตรวจสอบในขณะนี้</p>
      ) : (
        <ul className="posts-moderation-list">
          {posts.map((post) => (
            <li key={post._id} className="ui-card">
              <div className="posts-moderation-info">
                <p className="posts-moderation-author">
                  <Avatar user={post.user} size={32} />
                  <Link to={`/community/${post._id}`}>{post.user?.name}</Link>
                  <span className="posts-moderation-role">
                    {post.user?.role === "counsellor" || post.user?.role === "admin" ? "บุคลากรทางการแพทย์" : "ผู้ใช้ทั่วไป"}
                  </span>
                  <small>{DATE_TIME.format(new Date(post.createdAt))}</small>
                </p>
                <p className="posts-moderation-content">{post.content}</p>
                {post.tags?.length > 0 && <p className="posts-moderation-tags">{post.tags.map((tag) => `#${tag}`).join(" ")}</p>}

                <div className="posts-moderation-reports">
                  <p className="posts-moderation-reports-title"><Flag size={14} aria-hidden="true" />ถูกรายงาน {post.reports?.length || post.reportCount || 0} ครั้ง</p>
                  {post.reports?.length > 0 ? (
                    <ul>
                      {post.reports.map((report, index) => (
                        <li key={index}>
                          <span className="posts-moderation-reason">{report.reasonLabel || report.reason}</span>
                          {report.detail && <span className="posts-moderation-detail">“{report.detail}”</span>}
                          <small>โดย {report.reporter?.name || "ผู้ใช้"} · {report.createdAt ? DATE_TIME.format(new Date(report.createdAt)) : ""}</small>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="ui-muted">ไม่มีรายละเอียดเหตุผล (รายงานก่อนเริ่มเก็บเหตุผล)</p>}
                </div>
              </div>
              <div className="posts-moderation-actions">
                <Link to={`/community/${post._id}`} className="ui-btn ui-btn-outline"><ExternalLink size={15} aria-hidden="true" />ดูโพสต์</Link>
                <button type="button" className="ui-btn ui-btn-outline" onClick={() => startEdit(post)}><Pencil size={15} aria-hidden="true" />แก้ไข</button>
                <button type="button" className="posts-moderation-approve ui-btn ui-btn-outline" onClick={() => handleClear(post)}>
                  <Check size={16} />
                  <span>ตรวจสอบแล้ว</span>
                </button>
                <button type="button" className="posts-moderation-delete ui-btn ui-btn-outline" onClick={() => handleDelete(post)} title="ลบ" aria-label="ลบโพสต์">
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageCount={pageCount} setPage={setPage} total={total} />

      {editing && (
        <EditorDialog title="แก้ไขโพสต์ที่ถูกรายงาน" saveLabel="บันทึกและคืนโพสต์" onSave={saveEdit} onClose={() => setEditing(null)} saveDisabled={!editForm.content.trim()}>
          <p className="ui-muted">หลังบันทึก โพสต์จะแสดงอีกครั้ง และผู้ที่รายงานจะได้รับแจ้งว่ามีการแก้ไขแล้ว</p>
          <label className="ui-field">เนื้อหาโพสต์<textarea value={editForm.content} onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))} rows={7} maxLength={5000} /></label>
          <label className="ui-field">แท็ก (คั่นด้วยจุลภาค)<input type="text" value={editForm.tagsInput} onChange={(e) => setEditForm((f) => ({ ...f, tagsInput: e.target.value }))} /></label>
          <label className="ui-field">บันทึกภายใน (ไม่บังคับ)<input type="text" value={editForm.note} onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))} maxLength={500} placeholder="เช่น ปรับถ้อยคำที่ไม่เหมาะสมออก" /></label>
        </EditorDialog>
      )}
    </div>
  );
}

export default PostsModeration;
