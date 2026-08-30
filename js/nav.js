// ============================================
// NAV.JS — وضعیت حساب تو ناوبری + منوی همبرگری
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

    // کلیک روی هر لینک → بستن منو
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        burger.classList.remove("open");
        links.classList.remove("open");
      });
    });

    // کلیک بیرون از منو → بستن
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

  var session = null;
  try { session = JSON.parse(localStorage.getItem("or_session")); }
  catch (e) {}

  if (!session) {
    link.href = "account.html";
    link.textContent = "ورود/ثبت‌نام";
    return;
  }

  // کاربر واردشده: آواتار کوچیک + اسم → لینک به پروفایل
  link.href = "profile.html";
  link.textContent = "";
  link.classList.add("nav-user");

  var img = document.createElement("img");
  img.className = "nav-avatar";
  img.alt = "";
  img.src = localStorage.getItem("or_avatar_" + session.email) || "images/avatar-default.png";

  var span = document.createElement("span");
  span.textContent = session.name;

  link.appendChild(img);
  link.appendChild(span);
})();
