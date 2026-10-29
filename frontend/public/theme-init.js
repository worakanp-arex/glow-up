(function () {
  var stored;
  try {
    stored = localStorage.getItem("theme");
  } catch {
    stored = null; // storage อาจถูกบล็อก (หน้าต่างส่วนตัว การตั้งค่าเข้มงวด)
  }
  var theme =
    stored === "light" || stored === "dark"
      ? stored
      : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  document.documentElement.setAttribute("data-theme", theme);
})();
