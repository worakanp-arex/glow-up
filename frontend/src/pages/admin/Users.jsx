import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarHeart, Check, Filter, Pencil, Trash2, Users as UsersIcon, X } from "lucide-react";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import * as userService from "../../services/userService.js";
import "./Users.css";

const ROLE_LABELS = { user: "ผู้หางาน", employer: "นายจ้าง", admin: "ผู้ดูแลระบบ" };

function Users() {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", role: "user" });

  function load(params = {}) {
    setLoading(true);
    userService
      .listUsers(params)
      .then(setUsers)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function applyFilters() {
    const params = {};
    if (roleFilter) params.role = roleFilter;
    if (statusFilter) params.verifiedStatus = statusFilter;
    load(params);
  }

  async function handleVerify(user, status) {
    const updated = await userService.verifyUser(user._id, status);
    setUsers((prev) => prev.map((u) => (u._id === user._id ? updated : u)));
  }

  async function handleDelete(user) {
    if (!window.confirm(`ลบผู้ใช้ "${user.name}"?`)) return;
    await userService.deleteUser(user._id);
    setUsers((prev) => prev.filter((u) => u._id !== user._id));
  }

  function startEdit(user) {
    setEditingId(user._id);
    setEditForm({ name: user.name, phone: user.phone || "", role: user.role });
  }

  async function saveEdit(user) {
    const updated = await userService.updateUser(user._id, editForm);
    setUsers((prev) => prev.map((u) => (u._id === user._id ? updated : u)));
    setEditingId(null);
  }

  if (loading) {
    return <div className="users-page">กำลังโหลด...</div>;
  }

  return (
    <div className="users-page">
      <h1>
        <UsersIcon size={22} />
        <span>จัดการผู้ใช้งาน</span>
      </h1>
      <p className="users-subtitle">ตรวจสอบ ยืนยันตัวตน และจัดการบัญชีผู้หางาน นายจ้าง และผู้ดูแลระบบทั้งหมด</p>

      <div className="users-filters">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">ทุกบทบาท</option>
          <option value="user">ผู้หางาน</option>
          <option value="employer">นายจ้าง</option>
          <option value="admin">ผู้ดูแลระบบ</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">ทุกสถานะ</option>
          <option value="pending">รอดำเนินการ</option>
          <option value="verified">ยืนยันแล้ว</option>
          <option value="rejected">ปฏิเสธ</option>
        </select>
        <button type="button" className="btn btn-secondary" onClick={applyFilters}>
          <Filter size={15} />
          <span>กรอง</span>
        </button>
      </div>

      <div className="users-table">
        <div className="users-table-head">
          <span>ผู้ใช้งาน</span>
          <span>สถานะ</span>
          <span>จัดการ</span>
        </div>

        {users.length === 0 && <p className="users-empty">ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไข</p>}

        <ul className="users-list">
          {users.map((user) => (
            <li key={user._id}>
              {editingId === user._id ? (
                <form
                  className="users-edit-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveEdit(user);
                  }}
                >
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <input
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="เบอร์โทร"
                  />
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  >
                    <option value="user">ผู้หางาน</option>
                    <option value="employer">นายจ้าง</option>
                    <option value="admin">ผู้ดูแลระบบ</option>
                  </select>
                  <button type="submit" title="บันทึก">
                    <Check size={16} />
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} title="ยกเลิก">
                    <X size={16} />
                  </button>
                </form>
              ) : (
                <>
                  <div className="users-info">
                    <p className="users-name">{user.name}</p>
                    <p className="users-meta">
                      {user.email} · {ROLE_LABELS[user.role]}
                    </p>
                  </div>
                  <StatusBadge status={user.verifiedStatus} />
                  <div className="users-actions">
                    {user.verifiedStatus === "pending" && (
                      <>
                        <button
                          type="button"
                          className="users-action-approve"
                          onClick={() => handleVerify(user, "verified")}
                          title="ยืนยัน"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          className="users-action-reject"
                          onClick={() => handleVerify(user, "rejected")}
                          title="ปฏิเสธ"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                    {user.role === "user" && (
                      <Link to={`/admin/users/${user._id}/emotion`} title="ดูปฏิทินอารมณ์">
                        <CalendarHeart size={16} />
                      </Link>
                    )}
                    <button type="button" onClick={() => startEdit(user)} title="แก้ไข">
                      <Pencil size={16} />
                    </button>
                    <button type="button" className="users-delete" onClick={() => handleDelete(user)} title="ลบ">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Users;
