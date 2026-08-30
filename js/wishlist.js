// WISHLIST.JS — صفحه علاقه‌مندی‌ها + افزودن به سبد
(function(){
  function getSession(){ try{ return JSON.parse(localStorage.getItem("or_session")); }catch(e){ return null; } }
  var session=getSession();
  if(!session){ window.location.replace("account.html"); return; }

  function wishKey(){ return "or_wish_"+session.email; }
  function cartKey(){ return "or_cart_"+session.email; }
  function loadWish(){ try{ return JSON.parse(localStorage.getItem(wishKey()))||[]; }catch(e){ return []; } }
  function saveWish(a){ localStorage.setItem(wishKey(), JSON.stringify(a)); }
  function loadCart(){ try{ return JSON.parse(localStorage.getItem(cartKey()))||[]; }catch(e){ return []; } }
  function saveCart(a){ localStorage.setItem(cartKey(), JSON.stringify(a)); }

  var fmt=new Intl.NumberFormat("fa-IR");
  var root=document.getElementById("wishRoot");
  var toolbar=document.getElementById("wishToolbar");
  var countTop=document.getElementById("wishCountTop");
  var addAllBtn=document.getElementById("addAllToCart");
  var clearBtn=document.getElementById("clearWishlist");

  function render(){
    var ids=loadWish();
    root.innerHTML="";

    if(!ids.length){
      if(toolbar) toolbar.style.display="none";
      var empty=document.createElement("div");
      empty.className="wish-empty";
      empty.innerHTML='<b>هنوز چیزی لایک نکردی ♡</b><p>برو فروشگاه، رو قلب بزن تا اینجا بیاد.</p><a class="btn btn-primary" href="shop.html" style="margin-top:16px;">برو فروشگاه</a>';
      root.appendChild(empty);
      return;
    }

    if(toolbar){ toolbar.style.display="flex"; }
    if(countTop){ countTop.textContent=fmt.format(ids.length); }

    var grid=document.createElement("div");
    grid.className="wish-grid";

    ids.forEach(function(id){
      var p=(window.PRODUCTS||[]).find(function(x){ return x.id===id; });
      if(!p) return;

      var card=document.createElement("div");
      card.className="wish-card product-card";
      card.innerHTML=
        '<button class="remove-wish" data-id="'+p.id+'" type="button" title="حذف از علاقه‌مندی‌ها">✕</button>'+
        '<div class="thumb"><img loading="lazy" src="'+p.img+'" alt="'+p.name+'"></div>'+
        '<h3>'+p.name+'</h3>'+
        '<div class="product-meta"><span class="stars">'+'★'.repeat(Math.round(p.rating))+'</span><span>'+p.rating+' • '+fmt.format(p.reviewsCount)+' نظر</span></div>'+
        '<div class="row"><div class="price">'+fmt.format(p.price)+' <small>تومان</small></div><div style="display:flex; gap:6px;"><button class="btn btn-ghost" data-remove="'+p.id+'" type="button" style="padding:8px 12px; font-size:0.72rem;">حذف</button><button class="add-btn" type="button">افزودن به سبد</button></div></div>';

      card.addEventListener("click", function(e){
        if(e.target.closest(".remove-wish") || e.target.closest(".add-btn")) return;
        localStorage.setItem("or_last_product", p.id);
        window.location.href="product.html?id="+p.id;
      });

      function doRemove(){
        var list=loadWish();
        var idx=list.indexOf(p.id);
        if(idx>-1){ list.splice(idx,1); saveWish(list); window.showToast("از علاقه‌مندی‌ها حذف شد ♡"); render(); }
      }
      card.querySelector(".remove-wish").addEventListener("click", function(e){ e.stopPropagation(); doRemove(); });
      var rm2=card.querySelector("[data-remove]");
      if(rm2){ rm2.addEventListener("click", function(e){ e.stopPropagation(); doRemove(); }); }

      card.querySelector(".add-btn").addEventListener("click", function(e){
        e.stopPropagation();
        addSingleToCart(p, this);
      });

      grid.appendChild(card);
    });

    root.appendChild(grid);
  }

  function addSingleToCart(p, btn){
    var items=loadCart();
    var found=items.find(function(it){ return it.name===p.name; });
    if(found){ found.qty++; } else { items.push({name:p.name, price:p.price, img:p.img, qty:1}); }
    saveCart(items);
    if(btn){
      var orig=btn.textContent;
      btn.classList.add("added"); btn.textContent="✓ اضافه شد";
      setTimeout(function(){ btn.classList.remove("added"); btn.textContent=orig; },1200);
    }
    window.showToast(p.name+" به سبد اضافه شد 🛒");
  }

  // افزودن همه به سبد
  if(addAllBtn){
    addAllBtn.addEventListener("click", function(){
      var ids=loadWish();
      if(!ids.length) return;
      var items=loadCart();
      var added=0;
      ids.forEach(function(id){
        var p=(window.PRODUCTS||[]).find(function(x){ return x.id===id; });
        if(!p) return;
        var found=items.find(function(it){ return it.name===p.name; });
        if(found){ found.qty++; } else { items.push({name:p.name, price:p.price, img:p.img, qty:1}); added++; }
      });
      saveCart(items);
      window.showToast(fmt.format(ids.length)+" محصول به سبد اضافه شد 🛒 — میری سبد");
      setTimeout(function(){ window.location.href="cart.html"; }, 1000);
    });
  }

  // پاک کردن همه
  if(clearBtn){
    clearBtn.addEventListener("click", function(){
      if(confirm("همه علاقه‌مندی‌ها پاک شه؟")){
        saveWish([]);
        window.showToast("ویش‌لیست خالی شد");
        render();
      }
    });
  }

  render();
})();
