import { useEffect, useRef } from "react";

const prefersReducedMotion =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * เพิ่มคลาส `.is-visible` ให้องค์ประกอบเมื่อเลื่อนเข้ามาในหน้าจอ
 * เพื่อให้ CSS ขับ transition ของการเผยได้ ไม่ทำอะไรเมื่อผู้ใช้ตั้ง prefers-reduced-motion
 */
export function useReveal(options) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (prefersReducedMotion) {
      node.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("is-visible");
          observer.unobserve(node);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px", ...options }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [options]);

  return ref;
}
