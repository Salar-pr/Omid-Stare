// ALBUMS.JS — آلبوم‌ها از API + نوار خرید افقی زیر هر کارت
(function () {
  var grid = document.getElementById("albums");
  if (!grid) return;

  var K = window.AlbumKit;
  var fmt = window.fmtNum || function (n) { return n; };
  var user = null;
  var productsByAlbum = {};

  function cardHtml(a) {
    var tracks = a.tracks || [];
    var shown = tracks.slice(0, 4);
    var tracksHtml = shown.map(function (t) {
      return '<div class="track"><span class="num">' + t.trackNumber + "</span><b>" + escHtml(t.title) + "</b><small>" + K.durLabel(t.duration) + "</small></div>";
    }).join("");
    var count = a.trackCount != null ? a.trackCount : tracks.length;
    var more = count > shown.length ? '<a class="track-more" href="album.html?id=' + a.id + '">+ ' + fmt(count - shown.length) + " ترک دیگه — دیدن جزئیات آلبوم ←</a>" : "";

    return '<div class="album-card rv" data-album="' + a.id + '">' +
      '<a class="cover" href="album.html?id=' + a.id + '"><div class="vinyl"><div class="vinyl-label"><img loading="lazy" src="' + a.coverImage + '" alt="' + escHtml(a.title) + '" /></div></div></a>' +
      '<div class="album-info">' +
      '<h3><a class="album-title-link" href="album.html?id=' + a.id + '">' + escHtml(a.title) + "</a>" +
      (a.titleFa ? ' <small style="color:#a9a39a; font-weight:400;">— ' + escHtml(a.titleFa) + "</small>" : "") + "</h3>" +
      '<div class="album-meta"><span>' + (a.year || "") + "</span><span>" + escHtml(a.genre || "") + "</span><span>" + count + " TRACKS</span></div>" +
      (a.description ? '<p class="album-desc">' + escHtml(a.description) + "</p>" : "") +
      '<div class="tracklist">' + tracksHtml + more + "</div>" +
      '<a class="btn btn-ghost album-detail-btn" href="album.html?id=' + a.id + '">جزئیات آلبوم 👁️</a>' +
      "</div>" +
      K.buyBarHtml(productsByAlbum[a.id]) +
      "</div>";
  }

  function updateBadge(n) {
    var b = document.getElementById("albumsCartCount");
    if (b) { b.textContent = fmt(n); b.classList.toggle("show", n > 0); }
  }

  K.bindBuyBar(grid, { getUser: function () { return user; }, onCart: updateBadge });

  Promise.all([
    API.get("/albums"),
    API.get("/products?limit=60").catch(function () { return { data: { items: [] } }; }),
  ])
    .then(function (res) {
      var items = (res[0].data.items) || [];
      var products = (res[1].data && res[1].data.items) || [];
      items.forEach(function (a) {
        var p = K.matchProduct(a, products);
        if (p) productsByAlbum[a.id] = p;
      });

      if (!items.length) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#a9a39a; padding:40px;">هنوز آلبومی منتشر نشده 🌀</p>';
        return;
      }
      grid.innerHTML = items.map(cardHtml).join("");

      API.me().then(function (u) {
        user = u;
        if (!user) return;
        API.get("/cart").then(function (d) { updateBadge(d.data.count); }, function () {});
      }, function () {});
    })
    .catch(function (err) {
      grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#ff2d95; padding:40px;">' + API.msg(err, "خطا در بارگذاری آلبوم‌ها") + "</p>";
    });
})();
