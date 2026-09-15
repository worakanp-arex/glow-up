import PageHeader from "../../components/common/PageHeader.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import { usePagination } from "../../hooks/usePagination.js";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarHeart, Check, Filter, Pencil, Plus, Trash2, UserPlus, Users as UsersIcon, X } from "lucide-react";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import * as userService from "../../services/userService.js";
import "./Users.css";

const ROLE_LABELS = {
  user: "ผู้หางาน",
  family: "ครอบครัว/ผู้ดูแล",
  employer: "นายจ้าง",
  admin: "ผู้ดูแลระบบ",
  counsellor: "บุคลากรทางการแพทย์",
};

const INITIAL_STAFF_FORM = { name: "", email: "", password: "", phone: "", specialization: "", hospital: "" };

function Users() {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const pagination = usePagination(users);
  const [loadError, setLoadError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", role: "user" });
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffForm, setStaffForm] = useState(INITIAL_STAFF_FORM);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [staffError, setStaffError] = useState("");

  function load(params = {}) {
    setLoading(true);
    userService
      .listUsers(params)
      .then(setUsers)
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function applyFilters() {
    pagination.setPage(1);
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

  async function handleCreateStaff(e) {
    e.preventDefault();
    setStaffError("");
    setCreatingStaff(true);
    try {
      const created = await userService.createUser({ ...staffForm, role: "counsellor" });
      setUsers((prev) => [created, ...prev]);
      setStaffForm(INITIAL_STAFF_FORM);
      setShowStaffForm(false);
    } catch (err) {
      setStaffError(err.response?.data?.message || "สร้างบัญชีไม่สำเร็จ");
    } finally {
      setCreatingStaff(false);
    }
  }

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  if (loading) {
    return <div className="users-page"><AsyncState /></div>;
  }

  return (
    <div className="users-page">
      <PageHeader icon={UsersIcon} description={<>
        ตรวจสอบ ยืนยันตัวตน และจัดการบัญชีผู้หางาน นายจ้าง บุคลากรทางการแพทย์ และผู้ดูแลระบบทั้งหมด
      </>}>จัดการผู้ใช้งาน</PageHeader>

      <div className="users-filters">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">ทุกบทบาท</option>
          <option value="user">ผู้หางาน</option>
                    <option value="family">ครอบครัว/ผู้ดูแล</option>
          <option value="employer">นายจ้าง</option>
          <option value="counsellor">บุคลากรทางการแพทย์</option>
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
        <button type="button" className="btn btn-primary" onClick={() => setShowStaffForm((v) => !v)}>
          <UserPlus size={15} />
          <span>เพิ่มบุคลากรทางการแพทย์</span>
        </button>
      </div>

      {showStaffForm && (
        <form className="users-staff-form" onSubmit={handleCreateStaff}>
          <h2>
            <Plus size={16} />
            <span>สร้างบัญชีบุคลากรทางการแพทย์</span>
          </h2>
          <div className="users-staff-form-grid">
            <label>
              ชื่อ-นามสกุล
              <input
                value={staffForm.name}
                onChange={(e) => setStaffForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </label>
            <label>
              อีเมล
              <input
                type="email"
                value={staffForm.email}
                onChange={(e) => setStaffForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </label>
            <label>
              รหัสผ่าน
              <input
                type="password"
                value={staffForm.password}
                onChange={(e) => setStaffForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={8}
              />
            </label>
            <label>
              เบอร์โทร
              <input
                value={staffForm.phone}
                onChange={(e) => setStaffForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
            <label>
              ความเชี่ยวชาญ
              <input
                value={staffForm.specialization}
                onChange={(e) => setStaffForm((f) => ({ ...f, specialization: e.target.value }))}
                placeholder="เช่น จิตแพทย์, นักจิตวิทยา"
              />
            </label>
            <label>
              สังกัด
              <input
                value={staffForm.hospital}
                onChange={(e) => setStaffForm((f) => ({ ...f, hospital: e.target.value }))}
                placeholder="เช่น โรงพยาบาลธัญญารักษ์ขอนแก่น"
              />
            </label>
          </div>
          {staffError && <p className="users-staff-form-error">{staffError}</p>}
          <div className="users-staff-form-actions">
            <button type="submit" className="btn btn-primary" disabled={creatingStaff}>
              {creatingStaff ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowStaffForm(false)}>
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      <div className="users-table">
        <div className="users-table-head">
          <span>ผู้ใช้งาน</span>
          <span>สถานะ</span>
          <span>จัดการ</span>
        </div>

        {users.length === 0 && <p className="users-empty">ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไข</p>}

        <ul className="users-list">
          {pagination.items.map((user) => (
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
                    <option value="family">ครอบครัว/ผู้ดูแล</option>
                    <option value="employer">นายจ้าง</option>
                    <option value="counsellor">บุคลากรทางการแพทย์</option>
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
                    {user.role === "employer" && (user.companyName || user.taxId || user.businessType) && (
                      <p className="users-verification-detail">
                        {[user.companyName, user.businessType, user.taxId && `เลขผู้เสียภาษี: ${user.taxId}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    {user.role === "counsellor" && (user.specialization || user.hospital) && (
                      <p className="users-verification-detail">
                        {[user.specialization, user.hospital].filter(Boolean).join(" · ")}
                      </p>
                    )}
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
      <Pagination {...pagination} />
    </div>
  );
}

export default Users;
