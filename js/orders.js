// ORDERS.JS — psych
(function(){
  function getSession(){ try{ return JSON.parse(localStorage.getItem("or_session")); }catch(e){ return null; } }
  var session=getSession();
  if(!session){ window.location.replace("account.html"); return; }
  var KEY="or_orders_"+session.email;
  var fmt=new Intl.NumberFormat("fa-IR");
  var dateFmt=new Intl.DateTimeFormat("fa-IR", {dateStyle:"medium", timeStyle:"short"});
  var orders=[]; try{ orders=JSON.parse(localStorage.getItem(KEY))||[]; }catch(e){}
  var emptyBox=document.getElementById("ordersEmpty");
  var list=document.getElementById("ordersList");

  if(!orders.length){
    emptyBox.style.display="block";
    return;
  }
  emptyBox.style.display="none";

  orders.forEach(function(order, i){
    var card=document.createElement("div");
    card.className="order-card rv on";

    var head=document.createElement("div");
    head.className="order-head";
    var oid=document.createElement("span");
    oid.className="o-id";
    oid.textContent="سفر #"+fmt.format(orders.length-i);
    var date=document.createElement("span");
    date.className="o-date";
    try{ date.textContent=dateFmt.format(new Date(order.date)); }catch(e){ date.textContent=""; }
    head.appendChild(oid); head.appendChild(date);

    var itemsBox=document.createElement("div");
    itemsBox.className="o-items";
    order.items.forEach(function(it){
      var row=document.createElement("div");
      row.className="o-item";
      row.innerHTML='<img src="'+it.img+'" alt=""><b>'+it.name+'</b><span>×'+fmt.format(it.qty)+'</span><span>'+fmt.format(it.price*it.qty)+' ت</span>';
      itemsBox.appendChild(row);
    });

    var foot=document.createElement("div");
    foot.className="o-total";
    foot.innerHTML='<span>مبلغ کلِ تریپ</span><b>'+fmt.format(order.total)+' تومان</b>';

    card.appendChild(head);
    card.appendChild(itemsBox);
    card.appendChild(foot);
    list.appendChild(card);
  });
})();
