/* ============================================================
   Pineapple — Blog en Markdown + Selector de píldoras

   Basado en el mismo sistema que los anuncios de Pineapple Games.
   Renderiza entradas escritas en Markdown. Basta con subir un
   archivo `AAAA-MM-DD-titulo.md` a `blog/posts/` para que aparezca
   publicado automáticamente (los más recientes primero).

   CÓMO FUNCIONA POR DENTRO
   ------------------------
   1. Listado: se pide a la API de GitHub el contenido de
      `blog/posts` en main (api.github.com/repos/PineappleVA/
      pineappleva.github.io/contents/blog/posts?ref=main) y se
      quedan los .md (sin readme ni ocultos). Si la API falla
      (sin conexión o límite de peticiones), se lee el manifiesto
      local blog/posts/posts.json como respaldo.
   2. Cada archivo se descarga (raw.githubusercontent.com) y se
      renderiza con un mini-Markdown propio y seguro: primero se
      escapa todo el HTML y luego se convierten encabezados #..####,
      listas - y 1., citas >, bloques de código ```, hr ---,
      **negritas**, *cursivas*, `código`, [enlaces](url) e imágenes.
   3. Orden: por nombre de archivo descendente → AAAA-MM-DD manda.
   4. Selector: barra de píldoras fija bajo el menú. Cada píldora
      hace scroll a su entrada; un IntersectionObserver marca la
      activa según la entrada visible.
   ============================================================ */
(function () {
  "use strict";

  var ORG = "PineappleVA";
  var REPO = "pineappleva.github.io";
  var BRANCH = "main";

  /* ---------- Mini-renderizador Markdown (subconjunto seguro) ---------- */

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function renderInline(s) {
    s = s.replace(/!\[([^\]]*)\]\((https?:[^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^\*\n]+)\*/g, "$1<em>$2</em>");
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    return s;
  }

  function renderMarkdown(md) {
    var lines = String(md).replace(/\r\n/g, "\n").split("\n");
    var html = "", para = [], quote = [], list = null, inCode = false, codeBuf = [];

    function flushPara() {
      if (para.length) { html += "<p>" + para.map(renderInline).join("<br>") + "</p>"; para = []; }
    }
    function flushList() {
      if (list) { html += "</" + list + ">"; list = null; }
    }
    function flushQuote() {
      if (quote.length) { html += "<blockquote>" + quote.map(renderInline).join("<br>") + "</blockquote>"; quote = []; }
    }
    function flushAll() { flushPara(); flushList(); flushQuote(); }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i], t = line.trim(), m;

      if (/^```/.test(t)) {
        if (inCode) {
          html += "<pre><code>" + escapeHtml(codeBuf.join("\n")) + "</code></pre>";
          codeBuf = []; inCode = false;
        } else { flushAll(); inCode = true; }
        continue;
      }
      if (inCode) { codeBuf.push(line); continue; }
      if (t === "") { flushAll(); continue; }
      if (/^(-{3,}|\*{3,})$/.test(t)) { flushAll(); html += "<hr>"; continue; }

      if ((m = t.match(/^(#{1,4})\s+(.*)$/))) {
        flushAll();
        html += "<h" + m[1].length + ">" + renderInline(escapeHtml(m[2])) + "</h" + m[1].length + ">";
        continue;
      }
      if ((m = t.match(/^>\s?(.*)$/))) {
        flushPara(); flushList();
        quote.push(escapeHtml(m[1])); continue;
      }
      if ((m = t.match(/^[-*•]\s+(.*)$/))) {
        flushPara(); flushQuote();
        if (list !== "ul") { flushList(); list = "ul"; html += "<ul>"; }
        html += "<li>" + renderInline(escapeHtml(m[1])) + "</li>"; continue;
      }
      if ((m = t.match(/^\d+[.)]\s+(.*)$/))) {
        flushPara(); flushQuote();
        if (list !== "ol") { flushList(); list = "ol"; html += "<ol>"; }
        html += "<li>" + renderInline(escapeHtml(m[1])) + "</li>"; continue;
      }
      flushList(); flushQuote();
      para.push(escapeHtml(t));
    }
    if (inCode) html += "<pre><code>" + escapeHtml(codeBuf.join("\n")) + "</code></pre>";
    flushAll();
    return html;
  }

  /* ---------- Helpers ---------- */

  function fetchText(url) {
    return fetch(encodeURI(url)).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    });
  }

  var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  function postDate(name) {
    var m = String(name).match(/^(\d{4})-(\d{2})-(\d{2})-/);
    if (!m) return null;
    return parseInt(m[3], 10) + " " + MESES[parseInt(m[2], 10) - 1] + " " + m[1];
  }

  function readingMinutes(md) {
    var words = String(md).trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 180));
  }

  function extractTitle(md) {
    var lines = String(md).split("\n");
    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].trim();
      var m = t.match(/^#{1,3}\s+(.*)$/);
      if (m) return m[1].replace(/^[#\s]+/, "").replace(/[*_`]+/g, "").trim().slice(0, 80);
    }
    for (var j = 0; j < lines.length; j++) {
      var t2 = lines[j].trim();
      if (t2 && t2.length > 3 && !/^[-*#>!]/.test(t2)) {
        return t2.replace(/[*_`\[\]]+/g, "").trim().slice(0, 70);
      }
    }
    return "";
  }

  function loadPosts(files, resolveLocal) {
    if (!files.length) return Promise.reject(new Error("sin archivos"));
    var sorted = files.slice().sort().reverse(); // AAAA-MM-DD: más reciente primero
    return Promise.all(sorted.map(function (f) {
      return fetchText(resolveLocal(f)).then(function (md) { return { name: f, md: md }; });
    }));
  }

  /* ---------- Selector de píldoras ---------- */

  function ensureTabs(box) {
    var existing = document.getElementById("mdTabs");
    if (existing) return existing;
    var wrap = document.createElement("div");
    wrap.className = "md-tabs-wrap";
    wrap.innerHTML =
      '<div class="md-tabs-head">' +
      '<span class="md-tabs-title">Entradas</span>' +
      '<span class="md-tabs-count"></span>' +
      '</div>' +
      '<div class="md-tabs" id="mdTabs" role="tablist" aria-label="Elegir entrada"></div>';
    box.parentNode.insertBefore(wrap, box);
    return wrap.querySelector("#mdTabs");
  }

  function buildTabs(box, posts) {
    var tabs = ensureTabs(box);
    var wrap = tabs.parentNode;
    var countEl = wrap.querySelector(".md-tabs-count");
    if (countEl) countEl.textContent = posts.length + (posts.length === 1 ? " entrada" : " entradas");
    tabs.innerHTML = "";

    posts.forEach(function (p, idx) {
      var rawTitle = extractTitle(p.md);
      var fallback = p.name.replace(/\.md$/i, "").replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ");
      var title = rawTitle || fallback;
      var date = postDate(p.name) || "";

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "md-tab" + (idx === 0 ? " active" : "");
      btn.setAttribute("data-idx", String(idx));
      btn.innerHTML = escapeHtml(title) + '<span class="tab-date">' + escapeHtml(date) + "</span>";

      btn.addEventListener("click", function () {
        var target = document.getElementById("md-post-" + idx);
        if (!target) return;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        var all = tabs.querySelectorAll(".md-tab");
        for (var k = 0; k < all.length; k++) all[k].classList.remove("active");
        btn.classList.add("active");
        target.classList.add("is-highlight");
        setTimeout(function () { target.classList.remove("is-highlight"); }, 900);
        if (window.history && history.replaceState) {
          try { history.replaceState(null, "", "#" + target.id); } catch (e) {}
        }
      });

      tabs.appendChild(btn);
    });

    /* Marcar la píldora activa según la entrada visible */
    try {
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var m = entry.target.id.match(/md-post-(\d+)/);
            if (!m) return;
            var i = parseInt(m[1], 10);
            var items = tabs.querySelectorAll(".md-tab");
            for (var q = 0; q < items.length; q++) items[q].classList.remove("active");
            if (items[i]) {
              items[i].classList.add("active");
              /* que la píldora activa se vea en la barra */
              try { items[i].scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }); } catch (e2) {}
            }
          });
        }, { rootMargin: "-20% 0px -60% 0px", threshold: 0.05 });

        posts.forEach(function (_, idx) {
          var el = document.getElementById("md-post-" + idx);
          if (el) io.observe(el);
        });
      }
    } catch (e) {}

    /* Si se llega con #md-post-N en la URL, saltar a esa entrada */
    try {
      if (location.hash && /^#md-post-\d+/.test(location.hash)) {
        var targetHash = document.querySelector(location.hash);
        if (targetHash) {
          setTimeout(function () { targetHash.scrollIntoView({ behavior: "smooth", block: "start" }); }, 200);
        }
      }
    } catch (e3) {}
  }

  /* ---------- Render ---------- */

  function renderAll(box, posts) {
    box.innerHTML = "";
    posts.forEach(function (p, idx) {
      var art = document.createElement("article");
      art.className = "md-post";
      art.id = "md-post-" + idx;
      var date = postDate(p.name);
      var mins = readingMinutes(p.md);
      var meta =
        '<div class="post-meta">' +
        (date ? '<span class="pill">📅 ' + escapeHtml(date) + "</span>" : "") +
        '<span class="pill">☕ ' + mins + " min de lectura</span>" +
        '<span class="author">🍍 Pineapple</span>' +
        "</div>";
      art.innerHTML = meta + renderMarkdown(p.md);
      box.appendChild(art);
    });
    var end = document.createElement("p");
    end.className = "md-end";
    end.textContent = "🍍 No hay más entradas… por ahora.";
    box.appendChild(end);
    buildTabs(box, posts);
  }

  function renderEmpty(box) {
    box.innerHTML =
      '<div class="notice"><h3>Todavía no hay nada por aquí</h3>' +
      "<p>Cuando publiquemos la primera entrada, aparecerá aquí automáticamente.</p></div>";
    try {
      var tabs = document.getElementById("mdTabs");
      if (tabs) {
        var wrap = tabs.parentNode;
        var c = wrap.querySelector(".md-tabs-count");
        if (c) c.textContent = "0 entradas";
        tabs.innerHTML = "";
      }
    } catch (e) {}
  }

  /* ---------- Carga: API de GitHub con fallback a posts.json ---------- */
  document.querySelectorAll(".md-posts").forEach(function (box) {
    var localDir = (box.getAttribute("data-md-dir") || "./posts").replace(/\/$/, "");
    var apiDir = box.getAttribute("data-api-dir") || "";

    ensureTabs(box);
    box.innerHTML = '<p class="md-loading">Cargando entradas…</p>';

    function viaApi() {
      if (!apiDir) return Promise.reject(new Error("sin api"));
      var url = "https://api.github.com/repos/" + ORG + "/" + REPO + "/contents/" +
        apiDir.split("/").map(encodeURIComponent).join("/") + "?ref=" + encodeURIComponent(BRANCH);
      return fetch(url, { headers: { Accept: "application/vnd.github+json" } })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (items) {
          var files = (Array.isArray(items) ? items : [])
            .filter(function (it) {
              return it.type === "file" && /\.md$/i.test(it.name) &&
                it.name.toLowerCase() !== "readme.md" && it.name.charAt(0) !== ".";
            })
            .map(function (it) { return it.name; });
          return loadPosts(files, function (name) {
            return "https://raw.githubusercontent.com/" + ORG + "/" + REPO + "/" +
              encodeURIComponent(BRANCH) + "/" + apiDir + "/" + name;
          });
        });
    }

    function viaManifest() {
      return fetchText(localDir + "/posts.json").then(function (text) {
        var files = (JSON.parse(text).posts || []);
        return loadPosts(files, function (name) { return localDir + "/" + name; });
      });
    }

    viaApi()
      .catch(viaManifest)
      .then(function (posts) { renderAll(box, posts); })
      .catch(function () { renderEmpty(box); });
  });
})();
