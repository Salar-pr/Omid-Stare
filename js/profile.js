// PROFILE.JS — nemone-4 psych
(function(){
  var SESSION_KEY="or_session";
  function getSession(){ try{ return JSON.parse(localStorage.getItem(SESSION_KEY)); }catch(e){ return null; } }
  var session=getSession();
  if(!session){ window.location.replace("account.html"); return; }
  var fmt=new Intl.NumberFormat("fa-IR");
  document.getElementById("profileName").textContent=session.name;
  document.getElementById("profileEmail").textContent=session.email;
  document.getElementById("profileUsername").textContent="@"+session.email.split("@")[0];
  var saved=localStorage.getItem("or_avatar_"+session.email);
  if(saved) document.getElementById("avatarImg").src=saved;

  try{
    var orders=JSON.parse(localStorage.getItem("or_orders_"+session.email))||[];
    document.getElementById("statOrders").textContent=fmt.format(orders.length);
    if(orders.length) document.getElementById("ordersHint").textContent=fmt.format(orders.length)+" سفر ثبت‌شده";
  }catch(e){}

  try{
    var cart=JSON.parse(localStorage.getItem("or_cart_"+session.email))||[];
    var qty=cart.reduce(function(s,it){ return s+it.qty; },0);
    document.getElementById("statCart").textContent=fmt.format(qty);
    if(qty) document.getElementById("cartHint").textContent=fmt.format(qty)+" آیتم تو ووید";
  }catch(e){}

  try{
    var wish=JSON.parse(localStorage.getItem("or_wish_"+session.email))||[];
    var wh=document.getElementById("wishHint");
    if(wh && wish.length) wh.textContent=fmt.format(wish.length)+" آیتم تو ویش‌لیست ♡";
  }catch(e){}

  document.getElementById("logoutBtn").addEventListener("click", function(){
    localStorage.removeItem(SESSION_KEY);
    if(window.showToast) window.showToast("از ووید خارج شدی. پرتال همیشه بازه 🌀");
    setTimeout(function(){ window.location.href="account.html"; }, 900);
  });
})();
