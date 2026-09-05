// ALBUM.JS — صفحه‌ی جزئیات آلبوم (tracklist کامل + نوار خرید افقی + آلبوم‌های دیگر)
(function () {
  var root = document.getElementById("adRoot");
  if (!root) return;

  var K = window.AlbumKit;
  var fmt = window.fmtNum || function (n) { return n; };
  var user = null;
  var album = null;
  var product = null;
  var merch = [];
  var others = [];

  function render() {
    var a = album;
    var tracks = a.tracks || [];
    document.getElementById("bcName").textContent = a.title;
    document.title = a.title + " — OMID RASTAR";

    var tracksHtml = tracks.length
      ? tracks.map(function (t) {
          return '<div class="ad-track">' +
            '<span class="num">' + t.trackNumber + "</span>" +
            '<div class="ad-track-txt"><b>' + escHtml(t.title) + "</b></div>" +
            (t.audioUrl ? '<audio controls preload="none" src="' + t.audioUrl + '"></audio>' : "") +
            "<small>" + K.durLabel(t.duration) + "</small>" +
            "</div>";
        }).join("")
      : '<p style="color:#a9a39a; padding:14px;">ترکی برای این آلبوم ثبت نشده 🌀</p>';

    var merchHtml = merch.length
      ? '<section class="ad-block"><h2>محصولات مرتبط با این آلبوم</h2><div class="ad-others">' +
        merch.map(function (m) {
          return '<a class="ad-other" href="product.html?slug=' + encodeURIComponent(m.slug) + '">' +
            '<img loading="lazy" src="' + m.image + '" alt="' + escHtml(m.name) + '">' +
            "<b>" + escHtml(m.name) + "</b><small>" + fmt(m.price) + " تومان</small></a>";
        }).join("") + "</div></section>"
      : "";

    var othersHtml = others.length
      ? '<section class="ad-block"><h2>آلبوم‌های دیگه</h2><div class="ad-others">' +
        others.map(function (o) {
          return '<a class="ad-other" href="album.html?id=' + o.id + '">' +
            '<img loading="lazy" src="' + o.coverImage + '" alt="' + escHtml(o.title) + '">' +
            "<b>" + escHtml(o.title) + "</b><small>" + (o.year || "") + " • " + escHtml(o.genre || "") + "</small></a>";
        }).join("") + "</div></section>"
      : "";

    root.innerHTML =
      '<div class="ad-head">' +
      '<div class="ad-cover"><div class="vinyl"><div class="vinyl-label"><img src="' + a.coverImage + '" alt="' + escHtml(a.title) + '"></div></div></div>' +
      '<div class="ad-meta">' +
      "<h1>" + escHtml(a.title) + "</h1>" +
      (a.titleFa ? '<p class="ad-fa">' + escHtml(a.titleFa) + "</p>" : "") +
      '<div class="album-meta"><span>' + (a.year || "") + "</span><span>" + escHtml(a.genre || "") + "</span><span>" +
      fmt(tracks.length) + " TRACKS</span><span>" + K.totalDuration(tracks) + "</span></div>" +
      (a.description ? '<p class="ad-desc">' + escHtml(a.description) + "</p>" : "") +
      "</div></div>" +
      K.buyBarHtml(product) +
      '<section class="ad-block"><h2>لیست ترک‌ها</h2><div class="ad-tracks">' + tracksHtml + "</div></section>" +
      merchHtml +
      othersHtml +
      '<div class="ad-back"><a class="btn btn-ghost" href="albums.html">← برگشت به آلبوم‌ها</a></div>';
  }

  K.bindBuyBar(root, { getUser: function () { return user; } });

  var params = new URLSearchParams(window.location.search);
  var id = params.get("id") || "";
  if (!id) {
    root.innerHTML = '<p style="padding:40px; text-align:center; color:#a9a39a;">آلبوم مشخص نشده 🌀 <a href="albums.html">برگرد به آلبوم‌ها</a></p>';
    return;
  }

  Promise.all([
    API.get("/albums/" + encodeURIComponent(id)),
    API.get("/products?limit=60").catch(function () { return { data: { items: [] } }; }),
    API.get("/albums").catch(function () { return { data: { items: [] } }; }),
  ])
    .then(function (res) {
      album = res[0].data;
      var products = (res[1].data && res[1].data.items) || [];
      product = K.matchProduct(album, products);
      merch = K.relatedMerch(album, products, product);
      others = ((res[2].data && res[2].data.items) || []).filter(function (o) { return o.id !== album.id; }).slice(0, 4);
      render();
      API.me().then(function (u) { user = u; }, function () {});
    })
    .catch(function (err) {
      root.innerHTML = '<p style="padding:40px; text-align:center; color:#ff2d95;">' + API.msg(err, "آلبوم پیدا نشد") + '<br><a href="albums.html" style="color:#00ffd1;">برگرد به آلبوم‌ها</a></p>';
    });
})();
