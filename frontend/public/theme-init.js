(function () {
  var stored;
  try {
    stored = localStorage.getItem("theme");
  } catch {
    stored = null; // storage can be blocked (private windows, strict settings)
  }
  var theme =
    stored === "light" || stored === "dark"
      ? stored
      : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  document.documentElement.setAttribute("data-theme", theme);
})();
