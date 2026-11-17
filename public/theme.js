// Dijalankan sebelum render supaya tema tidak berkedip saat halaman dimuat.
(function () {
  try {
    var saved = localStorage.getItem("bypassurl-theme");
    if (saved === "light" || saved === "dark") {
      document.documentElement.dataset.theme = saved;
    }
  } catch (e) {}
})();
