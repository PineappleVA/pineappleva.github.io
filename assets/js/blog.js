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
      · /blog (.md-list) → tarjetas-resumen que enlazan a la URL
        limpia /blog/<slug>
      · entrada.html (#mdPost) → plantilla de entrada. Se llega a
        ella con la URL limpia mediante el enrutador de 404.html
        (fetch-swap) o serve.py en local; lee el slug de
        location.pathname (o ?p= como respaldo, validado con un
        patrón estricto), renderiza el Markdown, actualiza el
        <title> y pinta Anterior/Siguiente. El hero muestra solo el
        titular de la entrada.
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
    var html = "", para = [], quote = [], list = null, items = [], inCode = false, codeBuf = [];

    /* Los párrafos escritos con líneas partidas (wrap a ~80 columnas)
       se vuelven a unir con espacios: el texto fluye y no hay saltos
       raros a mitad de frase. Igual con las listas: una línea que no
       empieza con "- " pero sigue a un elemento es SU continuación. */
    function flushPara() {
      if (para.length) { html += "<p>" + para.map(renderInline).join(" ") + "</p>"; para = []; }
    }
    function flushList() {
      if (list) {
        html += items.map(function (it) { return "<li>" + renderInline(it) + "</li>"; }).join("") +
          "</" + list + ">";
        list = null; items = [];
      }
    }
    function flushQuote() {
      if (quote.length) { html += "<blockquote>" + quote.map(renderInline).join(" ") + "</blockquote>"; quote = []; }
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
        items.push(escapeHtml(m[1])); continue;
      }
      if ((m = t.match(/^\d+[.)]\s+(.*)$/))) {
        flushPara(); flushQuote();
        if (list !== "ol") { flushList(); list = "ol"; html += "<ol>"; }
        items.push(escapeHtml(m[1])); continue;
      }
      /* continuación: mientras haya una lista o una cita abierta, la
         línea pertenece al último elemento, no abre un párrafo nuevo */
      if (list) { items[items.length - 1] += " " + escapeHtml(t); continue; }
      if (quote.length) { quote.push(escapeHtml(t)); continue; }
      para.push(escapeHtml(t));
    }
    if (inCode) html += "<pre><code>" + escapeHtml(codeBuf.join("\n")) + "</code></pre>";
    flushAll();
    return html;
  }

  /* URL limpia de una entrada: /blog/<slug>.
     En producción la resuelve el enrutador de 404.html (fetch-swap
     manteniendo la URL bonita); en local lo hace serve.py. */
  function postUrl(name) {
    return "/blog/" + encodeURIComponent(String(name).replace(/\.md$/i, ""));
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

  function stripFirstHeading(md) {
    var lines = String(md).replace(/\r\n/g, "\n").split("\n");
    for (var i = 0; i < lines.length; i++) {
      if (/^#{1,3}\s+/.test(lines[i].trim())) {
        return lines.slice(0, i).concat(lines.slice(i + 1)).join("\n");
      }
    }
    return md;
  }

  function postDateParts(name) {
    var m = String(name).match(/^(\d{4})-(\d{2})-(\d{2})-/);
    if (!m) return null;
    return { d: parseInt(m[3], 10), mon: MESES[parseInt(m[2], 10) - 1] || "", y: m[1] };
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

  var COVERS = ["cov-amber", "cov-sunset", "cov-violet", "cov-teal", "cov-blue", "cov-rose"];

  /* portada estable por entrada: sale del nombre del archivo */
  function coverClass(name) {
    var h = 0, str = String(name);
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return COVERS[h % COVERS.length];
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function extractExcerpt(md) {
    var lines = String(md).replace(/\r\n/g, "\n").split("\n");
    var foundTitle = false, buf = [];
    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].trim();
      if (!t) { if (buf.length) break; continue; }
      if (!foundTitle) {
        if (/^#{1,3}\s+/.test(t)) foundTitle = true;
        continue;
      }
      if (/^[-*#>|!]/.test(t) || /^(-{3,}|\*{3,})$/.test(t) || /^```/.test(t)) break;
      buf.push(t);
      if (buf.join(" ").length > 170) break;
    }
    var text = buf.join(" ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")  /* enlaces → solo el texto */
      .replace(/[*_`]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length <= 170) return text;
    var cut = text.slice(0, 170);
    var sp = cut.lastIndexOf(" ");
    return (sp > 90 ? cut.slice(0, sp) : cut).replace(/[,;:.—-]+$/, "") + "…";
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
     MODO ÍNDICE (/blog): revista — cada entrada con su portada de
     color, la última destacada a todo lo ancho
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
      posts.forEach(function (p, idx) {
        var title = extractTitle(p.md) || p.name.replace(/\.md$/i, "").replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ");
        var date = postDate(p.name) || "";
        var mins = readingMinutes(p.md);
        var excerpt = extractExcerpt(p.md);

        var a = document.createElement("a");
        a.className = "post-card" + (idx === 0 ? " featured" : "");
        a.href = postUrl(p.name);
        a.style.animationDelay = (idx * 90) + "ms";

        var cover =
          '<span class="post-cover ' + coverClass(p.name) + '" aria-hidden="true">' +
          '<span class="cov-no">\u2116 ' + pad2(idx + 1) + "</span>" +
          '<span class="cov-pine">\uD83C\uDF51</span>' +
          "</span>";

        var head =
          '<span class="post-card-head">' +
          (idx === 0 ? '<span class="pill pill-brand">\u00DAltima entrada</span>' : "") +
          (date ? '<span class="pill">' + escapeHtml(date) + "</span>" : "") +
          '<span class="pill">' + mins + " min</span>" +
          "</span>";

        a.innerHTML =
          cover +
          '<div class="post-card-body">' +
          head +
          "<h3>" + escapeHtml(title) + "</h3>" +
          (excerpt ? "<p>" + escapeHtml(excerpt) + "</p>" : "") +
          '<div class="post-card-meta">' +
          (idx === 0 ? "<span>Por Pineapple</span>" : "<span></span>") +
          '<span class="post-card-more">Leer la entrada \u2192</span>' +
          "</div>" +
          "</div>";

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
    var pagerEl = document.getElementById("postPager");
    var shareBtn = document.getElementById("shareBtn");

    function renderError(msg) {
      postEl.innerHTML =
        '<div class="notice"><h3>Esta entrada no aparece</h3>' +
        "<p>" + escapeHtml(msg) + "</p>" +
        '<p style="margin-top:.6rem;"><a href="/blog">← Volver al blog</a></p></div>';
      if (titleEl) titleEl.textContent = "Entrada no encontrada";
      document.title = "Entrada no encontrada · Blog · Pineapple";
    }

    if (!VALID.test(fileName)) {
      renderError("No hay ninguna entrada con esta dirección.");
    } else {
      fetchText(localDir2 + "/" + fileName)
        .catch(function () { return fetchText(RAW_BASE + apiDir2 + "/" + fileName); })
        .then(function (md) {
          var title = extractTitle(md) || fileName;

          document.title = title + " · Blog · Pineapple";
          if (titleEl) titleEl.textContent = title;
          /* el hero de la página ya pinta el titular: fuera el h1 del cuerpo */
          postEl.innerHTML = renderMarkdown(stripFirstHeading(md));

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
