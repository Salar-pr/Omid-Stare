// ============================================
// ACCOUNT.JS — ورود/ثبت‌نام واقعی (بک‌اند + session cookie)
// ============================================
(function () {
  if (window.API.me) {
    // اگه قبلا وارد بودی → مستقیم پروفایل
    API.me().then(function (user) {
      if (user) { window.location.replace("profile.html"); }
    });
  }

  var tabLogin = document.getElementById("tabLogin");
  var tabSignup = document.getElementById("tabSignup");
  var loginForm = document.getElementById("loginForm");
  var signupForm = document.getElementById("signupForm");
  var loginError = document.getElementById("loginError");
  var signupError = document.getElementById("signupError");

  function switchTo(which) {
    if (which === "login") {
      tabLogin.classList.add("active"); tabSignup.classList.remove("active");
      loginForm.classList.add("active"); loginForm.classList.remove("hidden");
      signupForm.classList.remove("active"); signupForm.classList.add("hidden");
      loginForm.style.display = "block"; signupForm.style.display = "none";
    } else {
      tabSignup.classList.add("active"); tabLogin.classList.remove("active");
      signupForm.classList.add("active"); signupForm.classList.remove("hidden");
      loginForm.classList.remove("active"); loginForm.classList.add("hidden");
      signupForm.style.display = "block"; loginForm.style.display = "none";
    }
  }
  switchTo("login");
  tabLogin.addEventListener("click", function () { switchTo("login"); });
  tabSignup.addEventListener("click", function () { switchTo("signup"); });

  function go(msg) {
    if (window.showToast) window.showToast(msg);
    setTimeout(function () { window.location.href = window.API.withSession("profile.html"); }, 700);
  }

  function showErr(el, err, fallback) {
    el.textContent = err ? API.msg(err, fallback) : "";
  }

  signupForm.addEventListener("submit", function (e) {
    e.preventDefault();
    signupError.textContent = "";
    var name = document.getElementById("suName").value.trim();
    var email = document.getElementById("suEmail").value.trim().toLowerCase();
    var pass = document.getElementById("suPass").value;

    if (!name) { signupError.textContent = "اسمت رو بنویس! 🌀"; return; }
    if (!email) { signupError.textContent = "ایمیل خالیه!"; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { signupError.textContent = "ایمیل معتبر نیست."; return; }
    if (pass.length < 8) { signupError.textContent = "رمز حداقل ۸ کاراکتر باشه."; return; }

    var btn = signupForm.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    API.post("/auth/register", { name: name, email: email, password: pass })
      .then(function (d) { go(d.message || ("به ووید خوش اومدی، " + name + "! 🌀")); })
      .catch(function (err) { showErr(signupError, err); if (btn) btn.disabled = false; });
  });

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    loginError.textContent = "";
    var email = document.getElementById("loginEmail").value.trim().toLowerCase();
    var pass = document.getElementById("loginPass").value;
    if (!email) { loginError.textContent = "ایمیل خالیه!"; return; }
    if (!pass) { loginError.textContent = "رمز رو بزن!"; return; }

    var btn = loginForm.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    API.post("/auth/login", { email: email, password: pass })
      .then(function (d) { go(d.message || "خوش برگشتی! 👁️"); })
      .catch(function (err) { showErr(loginError, err, "ایمیل یا رمز اشتباهه!"); if (btn) btn.disabled = false; });
  });
})();
