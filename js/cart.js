// CART.JS — nemone-4 psych
(function(){
  function getSession(){ try{ return JSON.parse(localStorage.getItem("or_session")); }catch(e){ return null; } }
  var session=getSession();
  if(!session){ window.location.replace("account.html"); return; }
  var KEY="or_cart_"+session.email;
  var fmt=new Intl.NumberFormat("fa-IR");
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY))||[]; }catch(e){ return []; } }
  function save(a){ localStorage.setItem(KEY, JSON.stringify(a)); }

  var root=document.getElementById("cartRoot");

  function render(){
    var items=load();
    root.innerHTML="";

    if(!items.length){
      var empty=document.createElement("div");
      empty.className="empty-cart rv on";
      empty.innerHTML='<b>سبدت خالیه — ووید ساکته 🌀</b><p style="margin:10px 0 18px; color:#a9a39a;">یه چیزی بنداز تو سبد تا پرتال روشن شه.</p><a class="btn btn-primary" href="shop.html">برو فروشگاه</a>';
      root.appendChild(empty);
      return;
    }

    var wrap=document.createElement("div");
    wrap.className="cart-wrap";

    var list=document.createElement("div");
    list.className="cart-items";

    items.forEach(function(it, idx){
      var row=document.createElement("div");
      row.className="cart-item";
      row.innerHTML=
        '<img src="'+it.img+'" alt="'+it.name+'">'+
        '<div class="info"><b>'+it.name+'</b><small>'+fmt.format(it.price)+' تومان</small></div>'+
        '<div class="qty-box"><button type="button" class="plus">+</button><span>'+fmt.format(it.qty)+'</span><button type="button" class="minus">−</button></div>'+
        '<button class="remove-btn" type="button">✕</button>';
      
      var plus=row.querySelector(".plus");
      var minus=row.querySelector(".minus");
      var rem=row.querySelector(".remove-btn");

      plus.addEventListener("click", function(){
        it.qty++; save(items); render();
      });
      minus.addEventListener("click", function(){
        if(it.qty>1){ it.qty--; save(items); render(); }
        else { doRemove(idx); }
      });
      rem.addEventListener("click", function(){ doRemove(idx); });

      list.appendChild(row);
    });

    var summary=document.createElement("div");
    summary.className="cart-summary";
    var count=items.reduce(function(s,it){ return s+it.qty; },0);
    var total=items.reduce(function(s,it){ return s+it.price*it.qty; },0);
    summary.innerHTML=
      '<div class="sum-row"><span>تعداد</span><b>'+fmt.format(count)+' آیتم</b></div>'+
      '<div class="sum-row"><span>جمع</span><b>'+fmt.format(total)+' تومان</b></div>'+
      '<div class="sum-row grand"><span>قابل پرداخت</span><b>'+fmt.format(total)+' تومان</b></div>'+
      '<button class="btn btn-primary checkout-btn" id="checkoutBtn" type="button">پرداخت و ثبت سفر 🌀</button>'+
      '<p style="margin-top:12px; color:#7a7570; font-size:0.7rem; letter-spacing:1px; text-align:center;">پرداخت نمایشی — سفارش تو تاریخچه ثبت میشه.</p>';

    wrap.appendChild(list);
    wrap.appendChild(summary);
    root.appendChild(wrap);

    document.getElementById("checkoutBtn").addEventListener("click", function(){
      var ORDERS_KEY="or_orders_"+session.email;
      var orders=[]; try{ orders=JSON.parse(localStorage.getItem(ORDERS_KEY))||[]; }catch(e){}
      orders.unshift({id:Date.now(), date:new Date().toISOString(), items:items, total:total});
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
      localStorage.removeItem(KEY);
      if(window.showToast) window.showToast("سفارشت ثبت شد، "+session.name+"! 🌀");
      setTimeout(function(){ window.location.href="orders.html"; }, 1200);
    });
  }

  function doRemove(idx){
    var items=load();
    items.splice(idx,1);
    save(items);
    render();
    if(window.showToast) window.showToast("از سبد حذف شد");
  }

  render();
})();
