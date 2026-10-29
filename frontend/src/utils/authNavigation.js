// รักษาเฉพาะขั้นตอนคำเชิญของเราเท่านั้น ไม่รับ redirect ใดๆ ที่ส่งมาใน URL
export function inviteReturnTo(searchParams) {
  const target = searchParams.get("redirect");
  if (!target?.startsWith("/family/accept?")) return null;
  const url = new URL(target, "https://local.invalid");
  return url.origin === "https://local.invalid" && url.pathname === "/family/accept" ? url.pathname + url.search : null;
}
