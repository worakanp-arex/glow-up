import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as skillService from "../services/skillService.js";
import * as jobService from "../services/jobService.js";

// สถานะความตรงของทักษะและบุ๊กมาร์กสำหรับผู้หางานที่ล็อกอิน ผู้เยี่ยมชมและ
// บทบาทอื่นได้ค่าว่างและตัวสลับที่ไม่ทำอะไร ผู้เรียกจึงเรนเดอร์
// markup เดียวกันให้ทุกคนได้
export function useJobSeeker() {
  const { user, isAuthenticated } = useAuth();
  const isSeeker = isAuthenticated && user?.role === "user";
  const [mySkills, setMySkills] = useState([]);
  const [savedIds, setSavedIds] = useState(() => new Set());
  // งานที่เพิ่งบุ๊กมาร์ก เก็บไว้ไม่กี่วินาทีเพื่อให้หน้าชี้ไปยังคอร์สที่เกี่ยวข้องได้
  const [justSaved, setJustSaved] = useState(null);
  const hideTimer = useRef(null);
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  useEffect(() => {
    if (!isSeeker) return;
    skillService.getMySkills().then(setMySkills).catch(() => setMySkills([]));
    jobService.getSavedJobIds().then((ids) => setSavedIds(new Set(ids))).catch(() => {});
  }, [isSeeker]);

  const mySkillIds = useMemo(() => new Set(mySkills.map((item) => item.skill?._id).filter(Boolean)), [mySkills]);

  const toggleSaved = useCallback(async (jobId) => {
    const wasSaved = savedIds.has(jobId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(jobId); else next.add(jobId);
      return next;
    });
    try {
      if (wasSaved) {
        await jobService.unsaveJob(jobId);
        setJustSaved(null);
      } else {
        await jobService.saveJob(jobId);
        clearTimeout(hideTimer.current);
        setJustSaved(jobId);
        hideTimer.current = setTimeout(() => setJustSaved(null), 12000);
      }
    } catch {
      setSavedIds((prev) => {
        const revert = new Set(prev);
        if (wasSaved) revert.add(jobId); else revert.delete(jobId);
        return revert;
      });
    }
  }, [savedIds]);

  return { isSeeker, mySkills, mySkillIds, savedIds, toggleSaved, justSaved };
}
