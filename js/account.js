// ACCOUNT.JS — nemone-4 psych version
(function(){
  var USERS_KEY="or_users", SESSION_KEY="or_session";
  function getUsers(){ try{ return JSON.parse(localStorage.getItem(USERS_KEY))||[]; }catch(e){ return []; } }
  function saveUsers(l){ localStorage.setItem(USERS_KEY, JSON.stringify(l)); }
  function getSession(){ try{ return JSON.parse(localStorage.getItem(SESSION_KEY)); }catch(e){ return null; } }
  if(getSession()){ window.location.replace("profile.html"); return; }

  var tabLogin=document.getElementById("tabLogin");
  var tabSignup=document.getElementById("tabSignup");
  var loginForm=document.getElementById("loginForm");
  var signupForm=document.getElementById("signupForm");
  var loginError=document.getElementById("loginError");
  var signupError=document.getElementById("signupError");
  var emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function switchTo(which){
    if(which==="login"){
      tabLogin.classList.add("active"); tabSignup.classList.remove("active");
      loginForm.classList.add("active"); loginForm.classList.remove("hidden");
      signupForm.classList.remove("active"); signupForm.classList.add("hidden");
      loginForm.style.display="block"; signupForm.style.display="none";
    }else{
      tabSignup.classList.add("active"); tabLogin.classList.remove("active");
      signupForm.classList.add("active"); signupForm.classList.remove("hidden");
      loginForm.classList.remove("active"); loginForm.classList.add("hidden");
      signupForm.style.display="block"; loginForm.style.display="none";
    }
  }
  // init
  switchTo("login");
  tabLogin.addEventListener("click", function(){ switchTo("login"); });
  tabSignup.addEventListener("click", function(){ switchTo("signup"); });

  function loginAndGo(user, msg){
    localStorage.setItem(SESSION_KEY, JSON.stringify({name:user.name, email:user.email}));
    if(window.showToast) window.showToast(msg);
    setTimeout(function(){ window.location.href="profile.html"; }, 900);
  }

  signupForm.addEventListener("submit", function(e){
    e.preventDefault(); signupError.textContent="";
    var name=document.getElementById("suName").value.trim();
    var email=document.getElementById("suEmail").value.trim().toLowerCase();
    var pass=document.getElementById("suPass").value;
    if(!name){ signupError.textContent="اسمت رو بنویس! 🌀"; return; }
    if(!email){ signupError.textContent="ایمیل خالیه!"; return; }
    if(!emailRe.test(email)){ signupError.textContent="ایمیل معتبر نیست."; return; }
    if(pass.length<6){ signupError.textContent="رمز حداقل ۶ کاراکتر."; return; }
    var users=getUsers();
    if(users.some(function(u){ return u.email===email; })){ signupError.textContent="این ایمیل قبلا ثبت شده."; return; }
    users.push({name:name, email:email, pass:pass});
    saveUsers(users);
    loginAndGo({name:name,email:email}, "به ووید خوش اومدی، "+name+"! 🌀");
  });

  loginForm.addEventListener("submit", function(e){
    e.preventDefault(); loginError.textContent="";
    var email=document.getElementById("loginEmail").value.trim().toLowerCase();
    var pass=document.getElementById("loginPass").value;
    if(!email){ loginError.textContent="ایمیل خالیه!"; return; }
    if(!pass){ loginError.textContent="رمز رو بزن!"; return; }
    var user=getUsers().find(function(u){ return u.email===email && u.pass===pass; });
    if(!user){ loginError.textContent="ایمیل یا رمز اشتباهه!"; return; }
    loginAndGo(user, "خوش برگشتی، "+user.name+"! 👁️");
  });
})();
