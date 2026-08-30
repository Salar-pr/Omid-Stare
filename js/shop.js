// SHOP.JS — ایرانی استایل: فیلتر، جستجو، سایز، رنگ، قیمت، ویش‌لیست، سورت + سبد
(function(){
  var cartBtn=document.getElementById("cartBtn");
  var cartCount=document.getElementById("cartCount");
  var wishlistBtn=document.getElementById("wishlistBtn");
  var wishlistCount=document.getElementById("wishlistCount");
  var grid=document.getElementById("productsGrid");
  var productCountEl=document.getElementById("productCount");
  var searchInput=document.getElementById("searchInput");
  var sortSelect=document.getElementById("sortSelect");
  var priceRange=document.getElementById("priceRange");
  var priceRangeVal=document.getElementById("priceRangeVal");

  function getSession(){ try{ return JSON.parse(localStorage.getItem("or_session")); }catch(e){ return null; } }
  function cartKey(){ var s=getSession(); return s ? "or_cart_"+s.email : null; }
  function wishKey(){ var s=getSession(); return s ? "or_wish_"+s.email : null; }
  function loadCart(){ var k=cartKey(); if(!k) return []; try{ return JSON.parse(localStorage.getItem(k))||[]; }catch(e){ return []; } }
  function saveCart(a){ var k=cartKey(); if(k) localStorage.setItem(k, JSON.stringify(a)); }
  function loadWish(){ var k=wishKey(); if(!k) return []; try{ return JSON.parse(localStorage.getItem(k))||[]; }catch(e){ return []; } }
  function saveWish(a){ var k=wishKey(); if(k) localStorage.setItem(k, JSON.stringify(a)); }
  function parsePrice(t){ var en=t.replace(/[۰-۹]/g, function(d){ return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); }); var d=en.replace(/[^0-9]/g,""); return d?parseInt(d,10):0; }

  var fmt=new Intl.NumberFormat("fa-IR");

  // state فیلتر
  var state={
    cats: new Set(["همه"]),
    maxPrice: 4000000,
    sizes: new Set(),
    colors: new Set(),
    inStockOnly: false,
    search: "",
    sort: "featured"
  };

  function refreshCounts(){
    var cart=loadCart();
    var total=cart.reduce(function(s,it){ return s+it.qty; },0);
    if(cartCount){ cartCount.textContent=fmt.format(total); cartCount.classList.toggle("show", total>0); }
    var wish=loadWish();
    if(wishlistCount){ wishlistCount.textContent=fmt.format(wish.length); wishlistCount.classList.toggle("show", wish.length>0); }
  }
  refreshCounts();

  if(cartBtn){ cartBtn.addEventListener("click", function(){ window.location.href="cart.html"; }); }
  if(wishlistBtn){ wishlistBtn.addEventListener("click", function(){
    if(!getSession()){ window.showToast("برای ویش‌لیست وارد شو 🌀", true); setTimeout(function(){ window.location.href="account.html"; },1200); return; }
    window.location.href="wishlist.html";
  }); }

  // رندر محصولات
  function render(){
    var products=window.PRODUCTS.slice();

    // فیلتر دسته
    if(!state.cats.has("همه")){
      products=products.filter(function(p){ return state.cats.has(p.category); });
    }
    // قیمت
    products=products.filter(function(p){ return p.price <= state.maxPrice; });
    // سایز
    if(state.sizes.size){
      products=products.filter(function(p){ return p.sizes.some(function(s){ return state.sizes.has(s); }); });
    }
    // رنگ
    if(state.colors.size){
      products=products.filter(function(p){ return p.colors.some(function(c){ return state.colors.has(c.name); }); });
    }
    // موجودی
    if(state.inStockOnly){
      products=products.filter(function(p){ return p.stock>0; });
    }
    // جستجو
    if(state.search){
      var q=state.search.toLowerCase();
      products=products.filter(function(p){ return (p.name+" "+p.en+" "+p.desc).toLowerCase().indexOf(q)>-1; });
    }
    // سورت
    if(state.sort==="price-asc") products.sort(function(a,b){ return a.price-b.price; });
    else if(state.sort==="price-desc") products.sort(function(a,b){ return b.price-a.price; });
    else if(state.sort==="rating") products.sort(function(a,b){ return b.rating-a.rating; });

    // count
    if(productCountEl) productCountEl.textContent=fmt.format(products.length);

    grid.innerHTML="";

    var wish=loadWish();

    products.forEach(function(p){
      var isWish=wish.indexOf(p.id)>-1;
      var stockClass = p.stock===0 ? "out" : (p.stock<6 ? "low" : "");
      var stockText = p.stock===0 ? "ناموجود" : (p.stock<6 ? "تنها "+fmt.format(p.stock)+" عدد" : "موجود");
      var stars = "★".repeat(Math.round(p.rating)) + "☆".repeat(5-Math.round(p.rating));

      var card=document.createElement("div");
      card.className="product-card";
      card.dataset.id=p.id;
      card.innerHTML=
        '<span class="badge">'+p.badge+'</span>'+
        '<button class="wishlist-btn '+(isWish?'active':'')+'" data-wish="'+p.id+'" type="button">'+(isWish?'♥':'♡')+'</button>'+
        '<div class="thumb"><img loading="lazy" src="'+p.img+'" alt="'+p.name+'"></div>'+
        '<h3>'+p.name+'</h3>'+
        '<div class="product-meta"><span class="stars">'+stars+'</span><span>('+fmt.format(p.reviewsCount)+')</span><span class="stock '+stockClass+'">'+stockText+'</span></div>'+
        '<p class="desc">'+p.desc+'</p>'+
        '<div class="row">'+
          '<div class="price">'+(p.oldPrice ? '<span class="old-price">'+fmt.format(p.oldPrice)+'</span>' : '')+fmt.format(p.price)+' <small>تومان</small></div>'+
          '<button class="add-btn" type="button" '+(p.stock===0?'disabled':'')+'>'+(p.stock===0?'ناموجود':'افزودن')+'</button>'+
        '</div>';

      // کلیک کارت -> صفحه جزئیات
      card.addEventListener("click", function(e){
        if(e.target.closest(".add-btn") || e.target.closest(".wishlist-btn")) return;
        localStorage.setItem("or_last_product", p.id);
        window.location.href="product.html?id="+p.id;
      });

      // ویش‌لیست
      var wb=card.querySelector(".wishlist-btn");
      wb.addEventListener("click", function(e){
        e.stopPropagation();
        if(!getSession()){ window.showToast("برای ویش‌لیست وارد شو 🌀", true); setTimeout(function(){ window.location.href="account.html"; },1200); return; }
        var list=loadWish();
        var idx=list.indexOf(p.id);
        if(idx>-1){ list.splice(idx,1); wb.classList.remove("active"); wb.textContent="♡"; window.showToast("از ویش‌لیست حذف شد"); }
        else { list.push(p.id); wb.classList.add("active"); wb.textContent="♥"; window.showToast("به ویش‌لیست اضافه شد ♡"); }
        saveWish(list);
        refreshCounts();
      });

      // افزودن به سبد
      var ab=card.querySelector(".add-btn");
      ab.addEventListener("click", function(e){
        e.stopPropagation();
        if(!getSession()){ window.showToast("برای خرید وارد حسابت شو 🌀", true); setTimeout(function(){ window.location.href="account.html"; },1200); return; }
        if(ab.classList.contains("added")) return;
        var items=loadCart();
        var found=items.find(function(it){ return it.name===p.name; });
        if(found){ found.qty++; } else { items.push({name:p.name, price:p.price, img:p.img, qty:1}); }
        saveCart(items);

        var orig=ab.textContent;
        ab.classList.add("added"); ab.textContent="✓ اضافه شد";
        setTimeout(function(){ ab.classList.remove("added"); ab.textContent=orig; },1200);

        // انیمیشن کند + فید
        var img=card.querySelector(".thumb img");
        if(img && cartBtn){
          var from=img.getBoundingClientRect();
          var to=cartBtn.getBoundingClientRect();
          var fly=img.cloneNode(true);
          fly.className="fly-img";
          fly.style.top=from.top+"px"; fly.style.left=from.left+"px";
          fly.style.width=from.width+"px"; fly.style.height=from.height+"px";
          fly.style.opacity="0.92"; fly.style.filter="blur(0px) saturate(1.2)";
          document.body.appendChild(fly);
          void fly.offsetWidth;
          var dx=to.left+to.width/2 - (from.left+from.width/2);
          var dy=to.top+to.height/2 - (from.top+from.height/2);
          fly.style.transform="translate("+dx+"px,"+dy+"px) scale(0.18) rotate(10deg)";
          fly.style.opacity="0.12"; fly.style.filter="blur(8px) saturate(0.5) brightness(1.2)"; fly.style.borderRadius="50%";
          var done=false;
          function onEnd(ev){ if(done) return; if(ev.propertyName!=="transform") return; done=true; fly.removeEventListener("transitionend", onEnd); fly.remove(); refreshCounts(); cartBtn.classList.remove("bump"); void cartBtn.offsetWidth; cartBtn.classList.add("bump"); cartBtn.style.boxShadow="0 0 28px rgba(255,45,149,0.45)"; setTimeout(function(){ cartBtn.style.boxShadow=""; },600); }
          fly.addEventListener("transitionend", onEnd);
          setTimeout(function(){ if(!done) onEnd({propertyName:"transform"}); },1500);
        } else { refreshCounts(); }
      });

      grid.appendChild(card);
    });

    if(!products.length){
      var empty=document.createElement("div");
      empty.style.gridColumn="1/-1"; empty.style.textAlign="center"; empty.style.padding="30px"; empty.style.color="#a9a39a";
      empty.innerHTML="محصولی با این فیلتر پیدا نشد 🌀<br><button class='btn btn-ghost' id='resetEmpty' style='margin-top:12px;'>پاک کردن فیلترها</button>";
      grid.appendChild(empty);
      var re=document.getElementById("resetEmpty");
      if(re) re.addEventListener("click", function(){ clearAll(); });
    }
  }

  function clearAll(){
    state.cats=new Set(["همه"]);
    state.maxPrice=4000000;
    state.sizes=new Set();
    state.colors=new Set();
    state.inStockOnly=false;
    state.search="";
    if(searchInput) searchInput.value="";
    if(priceRange) priceRange.value=4000000;
    if(priceRangeVal) priceRangeVal.textContent=fmt.format(4000000);
    document.querySelectorAll(".filter-cat").forEach(function(c){ c.checked = c.value==="همه"; });
    document.querySelectorAll(".size-chip").forEach(function(c){ c.classList.remove("active"); });
    document.querySelectorAll(".color-dot").forEach(function(c){ c.classList.remove("active"); });
    document.getElementById("inStockOnly").checked=false;
    render();
  }

  // ایونت‌های فیلتر
  document.querySelectorAll(".filter-cat").forEach(function(ch){
    ch.addEventListener("change", function(){
      if(ch.value==="همه" && ch.checked){
        document.querySelectorAll(".filter-cat").forEach(function(o){ if(o!==ch) o.checked=false; });
        state.cats=new Set(["همه"]);
      } else {
        document.querySelector('.filter-cat[value="همه"]').checked=false;
        if(ch.checked) state.cats.add(ch.value);
        else state.cats.delete(ch.value);
        if(state.cats.size===0){ state.cats=new Set(["همه"]); document.querySelector('.filter-cat[value="همه"]').checked=true; }
        else state.cats.delete("همه");
      }
      render();
    });
  });

  if(priceRange){
    priceRange.addEventListener("input", function(){
      state.maxPrice=parseInt(priceRange.value,10);
      if(priceRangeVal) priceRangeVal.textContent=fmt.format(state.maxPrice);
      render();
    });
  }

  document.querySelectorAll(".size-chip").forEach(function(chip){
    chip.addEventListener("click", function(){
      chip.classList.toggle("active");
      var s=chip.dataset.size;
      if(chip.classList.contains("active")) state.sizes.add(s);
      else state.sizes.delete(s);
      render();
    });
  });

  document.querySelectorAll(".color-dot").forEach(function(dot){
    dot.addEventListener("click", function(){
      dot.classList.toggle("active");
      var c=dot.dataset.color;
      if(dot.classList.contains("active")) state.colors.add(c);
      else state.colors.delete(c);
      render();
    });
  });

  var inStock=document.getElementById("inStockOnly");
  if(inStock){ inStock.addEventListener("change", function(){ state.inStockOnly=inStock.checked; render(); }); }

  if(searchInput){
    searchInput.addEventListener("input", function(){ state.search=searchInput.value.trim(); render(); });
  }

  if(sortSelect){
    sortSelect.addEventListener("change", function(){ state.sort=sortSelect.value; render(); });
  }

  var clearBtn=document.getElementById("clearFilters");
  if(clearBtn){ clearBtn.addEventListener("click", clearAll); }

  // مودال راهنمای سایز
  var guideLink=document.getElementById("sizeGuideLink");
  var guideModal=document.getElementById("sizeGuideModal");
  var guideClose=document.getElementById("sizeGuideClose");
  if(guideLink && guideModal){
    guideLink.addEventListener("click", function(e){ e.preventDefault(); guideModal.style.display="flex"; });
    guideClose.addEventListener("click", function(){ guideModal.style.display="none"; });
    guideModal.addEventListener("click", function(e){ if(e.target===guideModal) guideModal.style.display="none"; });
  }

  // init render
  render();
})();
