import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as skillService from "../services/skillService.js";
import * as jobService from "../services/jobService.js";

// Skill-match and bookmark state for signed-in job seekers. Guests and other
// roles get empty values and a no-op toggle, so callers can render the same
// markup for everyone.
export function useJobSeeker() {
  const { user, isAuthenticated } = useAuth();
  const isSeeker = isAuthenticated && user?.role === "user";
  const [mySkills, setMySkills] = useState([]);
  const [savedIds, setSavedIds] = useState(() => new Set());

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
      if (wasSaved) await jobService.unsaveJob(jobId);
      else await jobService.saveJob(jobId);
    } catch {
      setSavedIds((prev) => {
        const revert = new Set(prev);
        if (wasSaved) revert.add(jobId); else revert.delete(jobId);
        return revert;
      });
    }
  }, [savedIds]);

  return { isSeeker, mySkills, mySkillIds, savedIds, toggleSaved };
}
