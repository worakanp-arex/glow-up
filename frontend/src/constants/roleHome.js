// Where each role lands after login and when it leaves a page it can't use.
export const ROLE_HOME = {
  user: "/dashboard",
  family: "/family/dashboard",
  employer: "/employer/dashboard",
  counsellor: "/counsellor",
  admin: "/admin",
};

export function roleHome(role) {
  return ROLE_HOME[role] || "/";
}

// The job board is for visitors, people looking for work and employers; staff
// and family accounts never see job-search links.
export function canSearchJobs(user, isAuthenticated) {
  return !isAuthenticated || ["user", "employer"].includes(user?.role);
}
