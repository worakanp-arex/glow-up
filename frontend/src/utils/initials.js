// Up to two initials from a company or person name. Thai words can start
// with a leading vowel (เ แ โ ใ ไ) or carry tone marks, so take the first
// consonant/letter of each word instead of slicing raw characters.
const LEADING_VOWELS = /^[เ-ไ]/;

export function initials(name) {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => {
    const w = LEADING_VOWELS.test(word) ? word.slice(1) : word;
    return (w.match(/[A-Za-z0-9ก-ฮ]/) || [w[0]])[0];
  });
  return letters.join("").toUpperCase() || "?";
}
