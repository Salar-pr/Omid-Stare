// PRODUCT.JS — صفحه جزئیات محصول ایرانی استایل
(function(){
  function getSession(){ try{ return JSON.parse(localStorage.getItem("or_session")); }catch(e){ return null; } }
  function cartKey(){ var s=getSession(); return s ? "or_cart_"+s.email : null; }
  function wishKey(){ var s=getSession(); return s ? "or_wish_"+s.email : null; }
  function loadCart(){ var k=cartKey(); if(!k) return []; try{ return JSON.parse(localStorage.getItem(k))||[]; }catch(e){ return []; } }
  function saveCart(a){ var k=cartKey(); if(k) localStorage.setItem(k, JSON.stringify(a)); }
  function loadWish(){ var k=wishKey(); if(!k) return []; try{ return JSON.parse(localStorage.getItem(k))||[]; }catch(e){ return []; } }
  function saveWish(a){ var k=wishKey(); if(k) localStorage.setItem(k, JSON.stringify(a)); }

  var fmt=new Intl.NumberFormat("fa-IR");

  // گرفتن id از URL
  var params=new URLSearchParams(window.location.search);
  var id=parseInt(params.get("id"),10);
  if(isNaN(id)){
    var last=localStorage.getItem("or_last_product");
    id=last ? parseInt(last,10) : 0;
  }
  var p=(window.PRODUCTS||[]).find(function(x){ return x.id===id; });
  if(!p){ p=window.PRODUCTS[0]; }

  document.getElementById("bcName").textContent=p.name;
  document.title=p.name+" — OMID RASTAR";

  var root=document.getElementById("pdRoot");

  var stockClass = p.stock===0 ? "out" : (p.stock<6 ? "low" : "");
  var stockText = p.stock===0 ? "ناموجود" : (p.stock<6 ? "تنها "+fmt.format(p.stock)+" عدد در انبار باقیست!" : "موجود در انبار");
  var stars = "★".repeat(Math.round(p.rating)) + "☆".repeat(5-Math.round(p.rating));

  // گالری + اطلاعات
  var galleryHtml='<div class="gallery"><div class="main-thumb"><img id="mainImg" src="'+p.gallery[0]+'" alt="'+p.name+'"></div><div class="thumbs" id="thumbs">';
  p.gallery.forEach(function(src, i){
    galleryHtml+='<img src="'+src+'" data-src="'+src+'" class="'+(i===0?'active':'')+'" alt="">';
  });
  galleryHtml+='</div></div>';

  var colorsHtml='<div class="color-select">';
  p.colors.forEach(function(c, i){
    colorsHtml+='<button class="color-opt '+(i===0?'active':'')+'" data-color="'+c.name+'" style="background:'+c.hex+'" title="'+c.name+'"></button>';
  });
  colorsHtml+='</div>';

  var sizesHtml='<div class="size-select">';
  p.sizes.forEach(function(s, i){
    sizesHtml+='<button class="size-opt '+(i===0?'active':'')+'" data-size="'+s+'">'+s+'</button>';
  });
  sizesHtml+='</div>';

  var specsHtml='<table class="specs-table">';
  p.specs.forEach(function(row){
    specsHtml+='<tr><td>'+row[0]+'</td><td>'+row[1]+'</td></tr>';
  });
  specsHtml+='</table>';

  var featuresHtml='<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">';
  p.features.forEach(function(f){
    featuresHtml+='<span class="stock" style="border-color:rgba(255,255,255,0.12); background:rgba(255,255,255,0.04);">'+f+'</span>';
  });
  featuresHtml+='</div>';

  // تب‌ها
  var reviewsHtml='<div id="reviewsTab">';
  (window.PRODUCT_REVIEWS||[]).forEach(function(r){
    reviewsHtml+='<div class="review-card"><div class="review-head"><div class="review-avatar">'+r.avatar+'</div><div><b style="font-size:0.88rem;">'+r.user+'</b><div class="review-meta">'+'★'.repeat(r.rating)+' • '+r.date+'</div></div></div><p style="font-size:0.86rem; color:#c9c2b5; line-height:1.8;">'+r.text+'</p></div>';
  });
  reviewsHtml+='<div style="margin-top:14px; padding:14px; border:1px dashed rgba(255,255,255,0.10); border-radius:12px; text-align:center;"><p style="color:#a9a39a; font-size:0.82rem;">شما هم نظرتون رو بنویسید — فقط با خرید میتونید نظر تصویری بذارید.</p></div></div>';

  var qaHtml='<div id="qaTab">';
  (window.PRODUCT_QA||[]).forEach(function(q){
    qaHtml+='<div class="qa-item"><b>س: '+q.q+' <span style="color:#7a7570; font-weight:400; font-size:0.76rem;">— '+q.asker+'</span></b><p>ج: '+q.a+'</p></div>';
  });
  qaHtml+='</div>';

  var relatedHtml='<div class="related-grid">';
  window.PRODUCTS.filter(function(x){ return x.id!==p.id; }).slice(0,3).forEach(function(rp){
    relatedHtml+='<div class="related-card" data-id="'+rp.id+'"><img loading="lazy" src="'+rp.img+'" alt="'+rp.name+'"><b>'+rp.name+'</b><small>'+fmt.format(rp.price)+' تومان</small></div>';
  });
  relatedHtml+='</div>';

  var html=
    galleryHtml+
    '<div class="pd-info">'+
      '<span class="pd-badge">'+p.badge+'</span>'+
      '<h1 class="pd-title">'+p.name+'</h1>'+
      '<div class="pd-en">'+p.en+'</div>'+
      '<div class="pd-rating"><span class="stars">'+stars+'</span><span>'+p.rating+'</span><span style="color:#7a7570;">('+fmt.format(p.reviewsCount)+' نظر)</span><a href="#reviews" style="color:var(--cyan); font-size:0.78rem; margin-right:8px;">دیدن نظرات ←</a></div>'+
      '<div class="pd-price-box">'+
        '<div><span class="pd-old">'+(p.oldPrice ? fmt.format(p.oldPrice) : '')+'</span><span class="pd-price">'+fmt.format(p.price)+' تومان</span></div>'+
        '<div class="stock '+stockClass+'" style="margin-top:10px;">'+stockText+'</div>'+
        featuresHtml+
      '</div>'+
      '<div><label style="font-size:0.76rem; letter-spacing:1px; color:#c9c2b5;">رنگ</label>'+colorsHtml+'</div>'+
      '<div><label style="font-size:0.76rem; letter-spacing:1px; color:#c9c2b5;">سایز <a href="#" id="sizeGuideLink2" style="color:var(--cyan); font-size:0.7rem;">راهنمای سایز</a></label>'+sizesHtml+'</div>'+
      '<div class="pd-actions">'+
        '<button class="btn btn-primary" id="addToCartBtn" type="button" '+(p.stock===0?'disabled':'')+' style="flex:1;">'+(p.stock===0?'ناموجود':'افزودن به سبد 🛒')+'</button>'+
        '<button class="btn btn-ghost" id="wishBtn" type="button" style="padding:12px 16px;">♡</button>'+
      '</div>'+
      '<div class="tabs" dir="ltr"><button class="tab-btn active" data-tab="specs">SPECIFICATIONS</button><button class="tab-btn" data-tab="reviews">REVIEWS</button><button class="tab-btn" data-tab="qa">Q&A</button><button class="tab-btn" data-tab="related">RELATED</button></div>'+
      '<div class="tab-panel active" id="tab-specs"><h4 style="margin-bottom:8px;">مشخصات فنی — مثل دیجی‌کالا</h4>'+specsHtml+'</div>'+
      '<div class="tab-panel" id="tab-reviews">'+reviewsHtml+'</div>'+
      '<div class="tab-panel" id="tab-qa">'+qaHtml+'</div>'+
      '<div class="tab-panel" id="tab-related">'+relatedHtml+'</div>'+
    '</div>';

  root.innerHTML=html;

  // گالری
  var mainImg=document.getElementById("mainImg");
  document.querySelectorAll(".thumbs img").forEach(function(t){
    t.addEventListener("click", function(){
      document.querySelectorAll(".thumbs img").forEach(function(x){ x.classList.remove("active"); });
      t.classList.add("active");
      mainImg.src=t.dataset.src;
    });
  });

  // سایز و رنگ
  document.querySelectorAll(".size-opt").forEach(function(b){
    b.addEventListener("click", function(){
      document.querySelectorAll(".size-opt").forEach(function(x){ x.classList.remove("active"); });
      b.classList.add("active");
    });
  });
  document.querySelectorAll(".color-opt").forEach(function(b){
    b.addEventListener("click", function(){
      document.querySelectorAll(".color-opt").forEach(function(x){ x.classList.remove("active"); });
      b.classList.add("active");
    });
  });

  // تب‌ها
  document.querySelectorAll(".tab-btn").forEach(function(btn){
    btn.addEventListener("click", function(){
      document.querySelectorAll(".tab-btn").forEach(function(x){ x.classList.remove("active"); });
      document.querySelectorAll(".tab-panel").forEach(function(x){ x.classList.remove("active"); });
      btn.classList.add("active");
      document.getElementById("tab-"+btn.dataset.tab).classList.add("active");
    });
  });

  // ویش‌لیست
  var wishBtn=document.getElementById("wishBtn");
  var wish=loadWish();
  var isWish=wish.indexOf(p.id)>-1;
  wishBtn.textContent=isWish?'♥':'♡';
  wishBtn.classList.toggle("active", isWish);
  wishBtn.addEventListener("click", function(){
    if(!getSession()){ window.showToast("برای ویش‌لیست وارد شو 🌀", true); setTimeout(function(){ window.location.href="account.html"; },1200); return; }
    var list=loadWish();
    var idx=list.indexOf(p.id);
    if(idx>-1){ list.splice(idx,1); wishBtn.textContent="♡"; wishBtn.classList.remove("active"); window.showToast("از ویش‌لیست حذف شد"); }
    else { list.push(p.id); wishBtn.textContent="♥"; wishBtn.classList.add("active"); window.showToast("به ویش‌لیست اضافه شد ♡"); }
    saveWish(list);
  });

  // افزودن به سبد
  document.getElementById("addToCartBtn").addEventListener("click", function(){
    if(!getSession()){ window.showToast("برای خرید وارد حسابت شو 🌀", true); setTimeout(function(){ window.location.href="account.html"; },1200); return; }
    var items=loadCart();
    var found=items.find(function(it){ return it.name===p.name; });
    if(found){ found.qty++; } else { items.push({name:p.name, price:p.price, img:p.img, qty:1}); }
    saveCart(items);
    window.showToast("به سبد اضافه شد — میری سبد 🛒");
    setTimeout(function(){ window.location.href="cart.html"; }, 900);
  });

  // related click
  document.querySelectorAll(".related-card").forEach(function(rc){
    rc.addEventListener("click", function(){
      window.location.href="product.html?id="+rc.dataset.id;
    });
  });

  // size guide link
  var sg2=document.getElementById("sizeGuideLink2");
  if(sg2){ sg2.addEventListener("click", function(e){ e.preventDefault(); window.showToast("راهنمای سایز: S=48cm, M=51cm, L=54cm, XL=57cm, XXL=60cm عرض سینه"); }); }
})();
