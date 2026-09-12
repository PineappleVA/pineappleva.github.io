/* ============================================================
   Pineapple — Blog en Markdown (índice + página de entrada)

   Basado en el mismo sistema que los anuncios de Pineapple Games:
   sube un archivo `AAAA-MM-DD-titulo.md` a `blog/posts/` y se
   publica solo, ordenado de más reciente a más viejo.

   CÓMO FUNCIONA POR DENTRO
   ------------------------
   1. Listado: GET a la API de GitHub
      api.github.com/repos/PineappleVA/pineappleva.github.io/
      contents/blog/posts?ref=main → se quedan los .md (sin readme
      ni ocultos). Si la API falla (límite de peticiones, sin
      conexión), se lee el manifiesto blog/posts/posts.json.
   2. Descarga: cada .md se trae de raw.githubusercontent.com (main).
   3. Orden: descendente por nombre → la fecha del nombre manda.
   4. Render: mini-Markdown propio y seguro; primero se escapa TODO
      el HTML (& < > ") y después se convierte el subconjunto:
      #..####, listas - y 1., citas >, ```código```, ---,
      **negritas**, *cursivas*, `código`, [enlaces](url) e imágenes.
   5. Dos modos según la página:
      · blog.html (.md-list) → tarjetas-resumen que enlazan a la
        URL limpia /blog/<slug> (GitHub Pages sirve 404.html en esa
        ruta y main.js redirige a entrada.html?p=<slug>.md;
        el ?p= sigue funcionando como respaldo directo)
      · entrada.html (#mdPost) → carga el archivo (?p= o slug de la
        ruta /blog/..., validado con un patrón estricto), lo
        renderiza como página propia, actualiza el <title> y pinta
        Anterior/Siguiente.
   ============================================================ */
(function () {
  "use strict";

  var ORG = "PineappleVA";
  var REPO = "pineappleva.github.io";
  var BRANCH = "main";
  var RAW_BASE = "https://raw.githubusercontent.com/" + ORG + "/" + REPO + "/" + BRANCH + "/";

  /* ---------- Mini-renderizador Markdown (subconjunto seguro) ---------- */

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function renderInline(s) {
    s = s.replace(/!\[([^\]]*)\]\((https?:[^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    /* enlaces internos (relativos): misma pestaña */
    s = s.replace(/\[([^\]]+)\]\((?!https?:)([^)\s]+)\)/g, '<a href="$2">$1</a>');
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
      if (m) return m[1].replace(/^[#\s]+/, "").replace(/[*_`]+/g, "").trim().slice(0, 90);
    }
    for (var j = 0; j < lines.length; j++) {
      var t2 = lines[j].trim();
      if (t2 && t2.length > 3 && !/^[-*#>!]/.test(t2)) {
        return t2.replace(/[*_`\[\]]+/g, "").trim().slice(0, 80);
      }
    }
    return "";
  }

  function extractExcerpt(md) {
    var lines = String(md).split("\n");
    var foundTitle = false;
    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].trim();
      if (!t || /^[-*#>!]/.test(t) || /^```/.test(t)) { if (!t) foundTitle = foundTitle; continue; }
      if (!foundTitle) { foundTitle = true; continue; } /* la primera línea suele ser el título */
      return t.replace(/[*_`\[\]()]+/g, "").trim().slice(0, 150) + (t.length > 150 ? "…" : "");
    }
    return "";
  }

  /* Listado de archivos: API de GitHub con fallback a posts.json */
  function fetchList(apiDir, localDir) {
    function viaApi() {
      if (!apiDir) return Promise.reject(new Error("sin api"));
      var url = "https://api.github.com/repos/" + ORG + "/" + REPO + "/contents/" +
        apiDir.split("/").map(encodeURIComponent).join("/") + "?ref=" + encodeURIComponent(BRANCH);
      return fetch(url, { headers: { Accept: "application/vnd.github+json" } })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (items) {
          return (Array.isArray(items) ? items : [])
            .filter(function (it) {
              return it.type === "file" && /\.md$/i.test(it.name) &&
                it.name.toLowerCase() !== "readme.md" && it.name.charAt(0) !== ".";
            })
            .map(function (it) { return it.name; })
            .sort().reverse();
        });
    }
    function viaManifest() {
      return fetchText(localDir + "/posts.json").then(function (text) {
        return (JSON.parse(text).posts || []).slice().sort().reverse();
      });
    }
    return viaApi().catch(viaManifest);
  }

  /* ============================================================
     MODO ÍNDICE (blog.html): tarjetas-resumen
     ============================================================ */
  var listEl = document.querySelector(".md-list");
  if (listEl) {
    var apiDir = listEl.getAttribute("data-api-dir") || "";
    var localDir = (listEl.getAttribute("data-md-dir") || "blog/posts").replace(/\/$/, "");
    var countEl = document.getElementById("mdCount");

    fetchList(apiDir, localDir).then(function (files) {
      if (countEl) countEl.textContent = files.length + (files.length === 1 ? " entrada" : " entradas");
      if (!files.length) return Promise.reject(new Error("vacío"));
      return Promise.all(files.map(function (name) {
        /* cada archivo se pide primero en local (GitHub Pages también
           sirve los .md) y, si falla, en raw.githubusercontent.com */
        return fetchText(localDir + "/" + name)
          .catch(function () { return fetchText(RAW_BASE + apiDir + "/" + name); })
          .then(function (md) { return { name: name, md: md }; });
      }));
    }).then(function (posts) {
      listEl.innerHTML = "";
      posts.forEach(function (p) {
        var title = extractTitle(p.md) || p.name.replace(/\.md$/i, "").replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ");
        var date = postDate(p.name) || "";
        var mins = readingMinutes(p.md);
        var excerpt = extractExcerpt(p.md);

        var a = document.createElement("a");
        a.className = "post-card reveal visible";
        a.href = postUrl(p.name);
        a.innerHTML =
          '<div class="post-card-head">' +
          (date ? '<span class="pill">📅 ' + escapeHtml(date) + "</span>" : "") +
          '<span class="pill">☕ ' + mins + " min</span>" +
          "</div>" +
          "<h3>" + escapeHtml(title) + "</h3>" +
          (excerpt ? "<p>" + escapeHtml(excerpt) + "</p>" : "") +
          '<span class="post-card-more">Leer la entrada →</span>';
        listEl.appendChild(a);
      });
    }).catch(function () {
      if (countEl) countEl.textContent = "0 entradas";
      listEl.innerHTML =
        '<div class="notice" style="grid-column:1/-1;"><h3>Todavía no hay nada por aquí</h3>' +
        "<p>Cuando publiquemos la primera entrada, aparecerá aquí automáticamente.</p></div>";
    });
  }

  /* ============================================================
     MODO ENTRADA (entrada.html?p=nombre.md)
     ============================================================ */
  var postEl = document.getElementById("mdPost");
  if (postEl) {
    var apiDir2 = postEl.getAttribute("data-api-dir") || "";
    var localDir2 = (postEl.getAttribute("data-md-dir") || "blog/posts").replace(/\/$/, "");

    var params = new URLSearchParams(location.search);
    var fileName = params.get("p") || "";
    /* URL bonita: /blog/<slug> → archivo <slug>.md (404.html la reenvía aquí) */
    if (!fileName) {
      var pm = location.pathname.match(/\/blog\/([A-Za-z0-9\-]+)\/?$/);
      if (pm) fileName = decodeURIComponent(pm[1]) + ".md";
    }
    var VALID = /^\d{4}-\d{2}-\d{2}-[a-z0-9\-]+\.md$/i;

    var titleEl = document.getElementById("postTitle");
    var metaEl = document.getElementById("postMeta");
    var pagerEl = document.getElementById("postPager");
    var shareBtn = document.getElementById("shareBtn");

    function renderError(msg) {
      postEl.innerHTML =
        '<div class="notice"><h3>Esta entrada no aparece</h3>' +
        "<p>" + escapeHtml(msg) + "</p>" +
        '<p style="margin-top:.6rem;"><a href="blog.html">← Volver al blog</a></p></div>';
      if (titleEl) titleEl.textContent = "Entrada no encontrada";
      if (metaEl) metaEl.textContent = "";
      document.title = "Entrada no encontrada · Blog · Pineapple";
    }

    if (!VALID.test(fileName)) {
      renderError("No hay ninguna entrada con esta dirección.");
    } else {
      fetchText(localDir2 + "/" + fileName)
        .catch(function () { return fetchText(RAW_BASE + apiDir2 + "/" + fileName); })
        .then(function (md) {
          var title = extractTitle(md) || fileName;
          var date = postDate(fileName);
          var mins = readingMinutes(md);

          document.title = title + " · Blog · Pineapple";
          if (titleEl) titleEl.textContent = title;
          if (metaEl) {
            metaEl.innerHTML =
              (date ? '<span class="pill">📅 ' + escapeHtml(date) + "</span>" : "") +
              '<span class="pill">☕ ' + mins + " min de lectura</span>" +
              '<span class="author">🍍 Pineapple</span>';
          }
          postEl.innerHTML = renderMarkdown(md);

          if (shareBtn && !shareBtn.dataset.bound) {
            shareBtn.dataset.bound = "1";
            shareBtn.addEventListener("click", function () {
              var url = location.href;
              function done() {
                var old = shareBtn.textContent;
                shareBtn.textContent = "¡Copiado!";
                setTimeout(function () { shareBtn.textContent = old; }, 1600);
              }
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(done, function () { prompt("Copia el enlace:", url); });
              } else {
                prompt("Copia el enlace:", url);
              }
            });
          }

          /* Anterior (más reciente) / Siguiente (más antigua) */
          if (pagerEl) {
            fetchList(apiDir2, localDir2).then(function (files) {
              var i = files.indexOf(fileName);
              if (i === -1) return;
              var newer = i > 0 ? files[i - 1] : null;      /* más reciente */
              var older = i < files.length - 1 ? files[i + 1] : null; /* más antigua */
              if (!newer && !older) return;

              function card(file, dir, label) {
                return (
                  '<a class="pager-card ' + dir + '" href="' + postUrl(file) + '">' +
                  '<span class="dir">' + label + "</span>" +
                  '<span class="t">' + escapeHtml(extractTitleCache(file) || file) + "</span></a>"
                );
              }
              /* títulos del listado sin descargar todo: los resolvemos
                 solo si la entrada ya está en caché; si no, nombre limpio */
              var cache = {};
              cache[fileName] = title;
              function extractTitleCache(file) {
                return cache[file] ||
                  file.replace(/\.md$/i, "").replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ");
              }

              pagerEl.innerHTML =
                (newer ? card(newer, "prev", "← Más reciente") : "<span></span>") +
                (older ? card(older, "next", "Más antigua →") : "<span></span>");
              pagerEl.removeAttribute("hidden");

              /* intenta poner títulos reales descargando los vecinos */
              [newer, older].forEach(function (file) {
                if (!file) return;
                fetchText(localDir2 + "/" + file)
                  .catch(function () { return fetchText(RAW_BASE + apiDir2 + "/" + file); })
                  .then(function (md2) {
                    cache[file] = extractTitle(md2);
                    var link = pagerEl.querySelector('a[href="' + postUrl(file) + '"] .t');
                    if (link) link.textContent = cache[file];
                  })
                  .catch(function () {});
              });
            }).catch(function () {});
          }
        })
        .catch(function () {
          renderError("Puede que se haya borrado, renombrado o que la dirección esté mal escrita.");
        });
    }
  }
})();
