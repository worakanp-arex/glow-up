import PageHeader from "../../components/common/PageHeader.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ShieldAlert, Trash2 } from "lucide-react";
import * as postService from "../../services/postService.js";
import useConfirmDialog from "../../components/common/useConfirmDialog.jsx";
import "./PostsModeration.css";

const PAGE_SIZE = 10;

function PostsModeration() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    postService
      .getFlaggedPostsPage({ page, limit: PAGE_SIZE }, controller.signal)
      .then(({ items, total: count }) => {
        if (controller.signal.aborted) return;
        setPosts(items);
        setTotal(count);
      })
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function handleClear(post) {
    await postService.unflagPost(post._id);
    setPosts((prev) => prev.filter((p) => p._id !== post._id));
  }

  const { confirm, confirmDialog } = useConfirmDialog();

  function handleDelete(post) {
    confirm({
      title: "ลบโพสต์",
      message: "ต้องการลบโพสต์นี้ใช่ไหม? การลบไม่สามารถย้อนกลับได้",
      confirmLabel: "ลบโพสต์",
      onConfirm: async () => {
        await postService.deletePost(post._id);
        setPosts((prev) => prev.filter((p) => p._id !== post._id));
      },
    });
  }

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  if (loading) {
    return <div className="posts-moderation-page"><AsyncState /></div>;
  }

  return (
    <div className="posts-moderation-page">
      {confirmDialog}
      <PageHeader icon={ShieldAlert} description={<>
        โพสต์ที่ผู้ใช้กดรายงานเนื้อหา รอการตรวจสอบความถูกต้อง โดยเฉพาะข้อมูลด้านสุขภาพ
      </>}>ตรวจสอบโพสต์ที่ถูกรายงาน</PageHeader>

      {posts.length === 0 && <p className="posts-moderation-empty">ไม่มีโพสต์ที่รอตรวจสอบในขณะนี้</p>}

      <ul className="posts-moderation-list">
        {posts.map((post) => (
          <li key={post._id}>
            <div className="posts-moderation-info">
              <p className="posts-moderation-author">
                <Link to={`/community/${post._id}`}>{post.user?.name}</Link>
                <span className="posts-moderation-role">
                  {post.user?.role === "counsellor" || post.user?.role === "admin"
                    ? "บุคลากรทางการแพทย์"
                    : "ผู้ใช้ทั่วไป"}
                </span>
              </p>
              <p className="posts-moderation-content">{post.content}</p>
            </div>
            <div className="posts-moderation-actions">
              <button type="button" className="posts-moderation-approve" onClick={() => handleClear(post)}>
                <Check size={16} />
                <span>ตรวจสอบแล้ว</span>
              </button>
              <button type="button" className="posts-moderation-delete" onClick={() => handleDelete(post)} title="ลบ">
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={page} pageCount={pageCount} setPage={setPage} total={total} />
    </div>
  );
}

export default PostsModeration;
