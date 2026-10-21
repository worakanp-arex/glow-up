// Role-based artwork shown when a person has not uploaded a profile picture.
// Employer and admin accounts keep their initials so companies read as
// organisations rather than characters.
const DEFAULT_AVATARS = {
  user: "/images/avatars/user.webp",
  counsellor: "/images/avatars/staff.webp",
  family: "/images/avatars/family.webp",
};

export function defaultAvatarSrc(role) {
  return DEFAULT_AVATARS[role] || null;
}
