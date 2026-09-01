// ALBUMS.JS — آلبوم‌ها از API (دیسک + tracklist واقعی)
(function () {
  var grid = document.getElementById("albums");
  if (!grid) return;

  function durLabel(sec) {
    sec = Number(sec) || 0;
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  API.get("/albums")
    .then(function (d) {
      var items = d.data.items || [];
      if (!items.length) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#a9a39a; padding:40px;">هنوز آلبومی منتشر نشده 🌀</p>';
        return;
      }
      grid.innerHTML = items.map(function (a) {
        var tracksHtml = (a.tracks || []).map(function (t) {
          return '<div class="track"><span class="num">' + t.trackNumber + "</span><b>" + escHtml(t.title) + "</b><small>" + durLabel(t.duration) + "</small></div>";
        }).join("");
        return '<div class="album-card rv">' +
          '<div class="cover"><div class="vinyl"><div class="vinyl-label"><img loading="lazy" src="' + a.coverImage + '" alt="' + a.title + '" /></div></div></div>' +
          '<div class="album-info">' +
          "<h3>" + escHtml(a.title) + (a.titleFa ? ' <small style="color:#a9a39a; font-weight:400;">— ' + escHtml(a.titleFa) + "</small>" : "") + "</h3>" +
          '<div class="album-meta">' + (a.year || "") + " • " + (a.genre || "") + " • " + (a.trackCount != null ? a.trackCount : (a.tracks || []).length) + " TRACKS</div>" +
          (a.description ? '<p class="album-desc">' + escHtml(a.description) + "</p>" : "") +
          '<div class="tracklist">' + tracksHtml + "</div>" +
          "</div></div>";
      }).join("");
    })
    .catch(function (err) {
      grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#ff2d95; padding:40px;">' + API.msg(err, "خطا در بارگذاری آلبوم‌ها") + "</p>";
    });
})();
