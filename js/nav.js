// ============================================
// NAV.JS — وضعیت حساب تو ناوبری + منوی همبرگری
// (کاربر از /api/auth/me — session cookie، نه localStorage)
// ============================================
(function () {
  // ---------- منوی همبرگری (موبایل) ----------
  var burger = document.getElementById("hamburger");
  var links = document.querySelector(".nav-links");

  if (burger && links) {
    burger.addEventListener("click", function (e) {
      e.stopPropagation();
      burger.classList.toggle("open");
      links.classList.toggle("open");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        burger.classList.remove("open");
        links.classList.remove("open");
      });
    });
    document.addEventListener("click", function (e) {
      if (links.classList.contains("open") && !links.contains(e.target) && e.target !== burger) {
        burger.classList.remove("open");
        links.classList.remove("open");
      }
    });
  }

  // ---------- وضعیت حساب ----------
  var link = document.getElementById("navAccount");
  if (!link) return;

  link.href = "account.html";
  link.textContent = "ورود/ثبت‌نام";

  function render(user) {
    if (!user) return; // لینک ورود/ثبت‌نام
    link.href = "profile.html";
    link.textContent = "";
    link.classList.add("nav-user");
    var img = document.createElement("img");
    img.className = "nav-avatar";
    img.alt = "";
    img.src = user.avatarUrl || "images/avatar-default.png";
    var span = document.createElement("span");
    span.textContent = user.name;
    link.appendChild(img);
    link.appendChild(span);
  }

  if (window.API && API.me) {
    API.me().then(render);
  }
})();
