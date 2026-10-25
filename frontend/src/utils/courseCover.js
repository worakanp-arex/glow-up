const COVER_TONES = ["primary", "lilac", "peach", "sky"];

// The picture shown for a course: its own cover when staff set one, otherwise
// one of the built-in lesson covers chosen by position (`index`) or, when the
// position is unknown, by the course id so the same course keeps its cover.
export function courseCover(course, index) {
  if (course?.coverImage) return { src: course.coverImage, tone: "primary" };
  let position = index;
  if (position === undefined) {
    position = [...String(course?._id || "")].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  }
  const slot = ((position % 4) + 4) % 4;
  return { src: `/images/lessons/cover-${slot + 1}.png`, tone: COVER_TONES[slot] };
}
