// HOME.JS — index: محتوا از CMS (site_content) + محصولات/آلبوم‌های featured از DB
// اگه API در دسترس نباشه، HTML استاتیک صفحه دست‌نخورده می‌مونه.
(function () {
  var fmt = window.fmtNum;

  function colorize(text) {
    var map = [
      ["ماژنتای انفجاری", "var(--magenta)"],
      ["فیروزه‌ای اسیدی", "var(--cyan)"],
      ["بنفش کهکشانی", "var(--purple)"],
      ["لایمِ نئون", "var(--lime)"],
      ["نارنجی گدازه", "var(--orange)"],
    ];
    var out = String(text || "");
    map.forEach(function (m) {
      out = out.split(m[0]).join('<span style="color:' + m[1] + '">' + m[0] + "</span>");
    });
    return out.replace(/\n/g, "<br>");
  }

  function applyContent(c) {
    if (!c) return;

    if (c.hero) {
      var sub = document.querySelector(".hx-sub");
      if (sub && c.hero.sub) {
        sub.innerHTML = c.hero.sub +
          (c.hero.badge ? '<br><br><span style="font-size:0.74rem; letter-spacing:2px; color:var(--lime);">' + c.hero.badge + "</span>" : "");
      }
      var cta = document.querySelector(".hx-cta");
      if (cta) {
        var a1 = cta.children[0], a2 = cta.children[1];
        if (a1 && c.hero.cta1) { a1.textContent = c.hero.cta1.text; a1.href = c.hero.cta1.url; }
        if (a2 && c.hero.cta2) { a2.textContent = c.hero.cta2.text; a2.href = c.hero.cta2.url; }
      }
      var img = document.querySelector(".hx-img img");
      if (img && c.hero.image) img.src = c.hero.image;
      var note = document.querySelector(".contact-note");
      if (note && c.hero.contactNote) note.textContent = c.hero.contactNote;
    }

    if (c.manifest) {
      var q = document.querySelector(".about-quote");
      if (q && c.manifest.quote) q.innerHTML = c.manifest.quote;
      var b = document.querySelector(".about-body p");
      if (b && c.manifest.body) b.innerHTML = colorize(c.manifest.body);
    }

    if (c.socials && Array.isArray(c.socials)) {
      var s = document.querySelector(".footer .socials");
      if (s) {
        s.innerHTML = c.socials.map(function (x) {
          return '<a href="' + (x.url || "#") + '">' + x.label + "</a>";
        }).join("");
      }
    }
    if (c.footer_note) {
      var f = document.querySelector(".footer");
      if (f) {
        var socialsDiv = f.querySelector(".socials");
        f.childNodes.forEach(function (n) {
          if (n.nodeType === 3 && n.textContent.indexOf("OMID RASTAR") > -1) n.textContent = "\n        " + c.footer_note + "\n      ";
        });
      }
    }
  }

  function renderFeatured(slugs) {
    if (!slugs || !slugs.length) return;
    API.get("/products?" + new URLSearchParams({ slugs: slugs.join(","), limit: "12" }))
      .then(function (d) {
        var items = d.data.items || [];
        if (!items.length) return;
        var grid = document.querySelector(".feat-grid");
        if (!grid) return;
        grid.innerHTML = items.map(function (p, i) {
          var cls = i === 0 ? "feat-item feat-big rv" : "feat-item rv";
          return '<a class="' + cls + '" href="product.html?slug=' + p.slug + '">' +
            '<img loading="lazy" src="' + p.image + '" alt="' + p.name + '" />' +
            '<div class="feat-info"><b>' + p.name + '</b><span>' + fmt(p.price) + " ت</span></div></a>";
        }).join("");
      })
      .catch(function () {});
  }

  function renderDiscs() {
    API.get("/albums?limit=4")
      .then(function (d) {
        var items = (d.data.items || []).slice(0, 4);
        if (!items.length) return;
        var row = document.querySelector(".disc-row");
        if (!row) return;
        row.innerHTML = items.map(function (a) {
          return '<a class="disc-item" href="albums.html">' +
            '<img loading="lazy" src="' + a.coverImage + '" alt="' + a.title + '" />' +
            '<div class="disc-info"><b>' + a.title + "</b><small>" + a.year + "</small></div></a>";
        }).join("");
      })
      .catch(function () {});
  }

  // welcome portal: فقط ترجیح UI (localStorage مجاز) — آلبوم featured از CMS
  (function () {
    var welcomedKey = "or_welcomed_albums_liquid_void";

    function removeWelcome() {
      var w = document.getElementById("welcome");
      if (w) w.remove();
    }

    if (!localStorage.getItem(welcomedKey)) {
      // اگه ادمین از CMS خاموشش کرده باشه → همین حالا حذف کن و پرچم بزن
      API.get("/content").then(function (d) {
        var wa = d.data && d.data.welcome_albums;
        if (wa && wa.enabled === false) {
          localStorage.setItem(welcomedKey, "1");
          removeWelcome();
        }
      }).catch(function () {});

      setTimeout(function () {
        localStorage.setItem(welcomedKey, "1");
        removeWelcome();
      }, 4800);
    } else {
      removeWelcome();
    }
  })();

  API.get("/content")
    .then(function (d) {
      applyContent(d.data);
      renderFeatured(d.data.featured && d.data.featured.productSlugs);
    })
    .catch(function () {})
    .finally(function () { renderDiscs(); });
})();
