/* ============================================================
   Pineapple — Blog en Markdown (índice + página de entrada)

   Cada entrada vive en su propia carpeta, con el Markdown con la
   fecha y sus imágenes al lado:

     blog/posts/
       posts.json                  ← manifiesto de respaldo
       septiembre-ya-esta-aqui/
         2026-09-15.md             ← la entrada (la fecha del nombre manda)
         assets/
           banner.png              ← portada de la tarjeta y del hero
           lo-que-sea.png          ← imágenes para insertar en el .md

   CÓMO FUNCIONA POR DENTRO
   ------------------------
   1. Listado: UNA llamada a la API de GitHub (git/trees con
      recursive=1) devuelve el árbol completo del repo; de ahí salen
      las carpetas de blog/posts/, el .md de cada una (por su fecha)
      y si tiene assets/banner.*. El resultado se cachea en
      localStorage media hora para no chocar con el límite de la API.
      Si la API falla (límite, sin conexión…), se lee el manifiesto
      blog/posts/posts.json (acepta el formato nuevo y el antiguo).
   2. Descarga del .md: primero del propio sitio (GitHub Pages sirve
      los archivos tal cual) y, si falla, de raw.githubusercontent.
   3. Orden: descendente por la fecha del nombre del .md.
   4. Render: mini-Markdown propio y seguro; primero se escapa TODO
      el HTML (& < > ") y después se convierte el subconjunto:
      #..####, listas - y 1., citas >, ```código```, ---,
      **negritas**, *cursivas*, `código`, [enlaces](url) e imágenes.
      Novedades: las rutas relativas del .md (assets/…) se resuelven
      a la carpeta de la entrada, las imágenes sueltas con alt se
      convierten en <figure> con pie de foto y los h2–h4 reciben id
      para poder enlazarlos (#ancla).
   5. Portadas: si la entrada tiene assets/banner.*, la tarjeta del
      índice y el hero de la entrada lo enseñan; si no existe (o si
      falla la carga), se queda la portada de degradado de siempre.
   6. Dos modos según la página:
      · /blog (.md-list) → tarjetas-resumen que enlazan a la URL
        limpia /blog/<slug>
      · entrada.html (#mdPost) → la entrada completa. Se llega con la
        URL limpia /blog/<slug> (enrutador de 404.html o serve.py en
        local) o con entrada.html?p=<slug>. Las URL antiguas con la
        fecha delante (/blog/2026-09-15-slug) se redirigen solas a
        la limpia.
   ============================================================ */
(function () {
  "use strict";

  var ORG = "PineappleVA";
  var REPO = "pineappleva.github.io";
  var BRANCH = "main";
  var POSTS_PATH = "blog/posts";
  var RAW_BASE = "https://raw.githubusercontent.com/" + ORG + "/" + REPO + "/" + BRANCH + "/";
  var TREE_API = "https://api.github.com/repos/" + ORG + "/" + REPO + "/git/trees/" + BRANCH + "?recursive=1";
  var TREE_CACHE_KEY = "pa-blog-tree-v2";
  var TREE_CACHE_TTL = 1800e3; /* media hora */

  /* ---------- Mini-renderizador Markdown (subconjunto seguro) ---------- */

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* id de ancla para títulos: minúsculas, sin acentos, con guiones */
  function headingId(text, used) {
    var base = String(text)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60);
    if (!base) base = "seccion";
    var id = base, n = 2;
    while (used[id]) { id = base + "-" + n; n++; }
    used[id] = true;
    return id;
  }

  /* Resuelve las rutas relativas del Markdown (assets/x.png, ./x.png)
     a la carpeta de la entrada. Las absolutas pasan tal cual. */
  function makeResolver(post, localDir) {
    return function (url) {
      url = String(url).trim();
      if (/^(https?:|\/|#|mailto:|data:|tel:)/i.test(url)) return url;
      return localDir + "/" + post.slug + "/" + encodeURI(url.replace(/^\.\//, ""));
    };
  }

  function renderInline(s, resolve) {
    resolve = resolve || function (u) { return u; };
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, url) {
      return '<img src="' + escapeHtml(resolve(url)) + '" alt="' + escapeHtml(alt) + '" loading="lazy" decoding="async">';
    });
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    /* enlaces internos (relativos o con / o #): misma pestaña */
    s = s.replace(/\[([^\]]+)\]\((?!https?:)([^)\s]+)\)/g, function (m, text, url) {
      return '<a href="' + escapeHtml(resolve(url)) + '">' + text + "</a>";
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^\*\n]+)\*/g, "$1<em>$2</em>");
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    return s;
  }

  function renderMarkdown(md, resolve) {
    var lines = String(md).replace(/\r\n/g, "\n").split("\n");
    var html = "", para = [], quote = [], list = null, items = [], inCode = false, codeBuf = [];
    var usedIds = {};

    /* Los párrafos escritos con líneas partidas (wrap a ~80 columnas)
       se vuelven a unir con espacios: el texto fluye y no hay saltos
       raros a mitad de frase. Igual con las listas: una línea que no
       empieza con "- " pero sigue a un elemento es SU continuación. */
    function flushPara() {
      if (!para.length) return;
      /* párrafo de una sola imagen → <figure> con pie de foto (alt) */
      if (para.length === 1) {
        var im = para[0].match(/^<img src="([^"]*)" alt="([^"]*)" loading="lazy" decoding="async">$/);
        if (im) {
          html += im[2]
            ? '<figure><img src="' + im[1] + '" alt="' + im[2] + '" loading="lazy" decoding="async"><figcaption>' + im[2] + "</figcaption></figure>"
            : "<p>" + para[0] + "</p>";
          para = [];
          return;
        }
      }
      html += "<p>" + para.join(" ") + "</p>";
      para = [];
    }
    function flushList() {
      if (list) {
        html += items.map(function (it) { return "<li>" + renderInline(it, resolve) + "</li>"; }).join("") +
          "</" + list + ">";
        list = null; items = [];
      }
    }
    function flushQuote() {
      if (quote.length) { html += "<blockquote>" + quote.map(function (q) { return renderInline(q, resolve); }).join(" ") + "</blockquote>"; quote = []; }
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
        var lvl = m[1].length;
        var inner = renderInline(escapeHtml(m[2]), resolve);
        if (lvl >= 2) {
          html += "<h" + lvl + ' id="' + headingId(m[2], usedIds) + '">' + inner + "</h" + lvl + ">";
        } else {
          html += "<h" + lvl + ">" + inner + "</h" + lvl + ">";
        }
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
      para.push(renderInline(escapeHtml(t), resolve));
    }
    if (inCode) html += "<pre><code>" + escapeHtml(codeBuf.join("\n")) + "</code></pre>";
    flushAll();
    return html;
  }

  /* URL limpia de una entrada: /blog/<slug-de-la-carpeta>.
     En producción la resuelve el enrutador de 404.html (fetch-swap
     manteniendo la URL bonita); en local lo hace serve.py. */
  function postUrl(slug) {
    return "/blog/" + encodeURIComponent(slug);
  }

  /* ---------- Helpers ---------- */

  function fetchText(url) {
    return fetch(encodeURI(url)).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    });
  }

  var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  /* fecha a partir del nombre del .md: 2026-09-15.md (o con sufijo) */
  function postDate(file) {
    var m = String(file).match(/^(\d{4})-(\d{2})-(\d{2})/);
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

  /* portada estable por entrada: sale del slug de la carpeta */
  function coverClass(slug) {
    var h = 0, str = String(slug);
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

  /* ---------- Listado de entradas ----------
     Cada entrada = una carpeta de blog/posts con un .md cuyo nombre
     empieza por la fecha. Devuelve {posts, optimistic} ordenadas de
     la más reciente a la más antigua. "optimistic" = no sabemos si
     hay banner (modo manifiesto) y se prueba con assets/banner.png. */

  function sortPosts(posts) {
    posts.sort(function (a, b) {
      if (a.file !== b.file) return a.file < b.file ? 1 : -1; /* fecha desc */
      return a.slug < b.slug ? 1 : -1;
    });
    return posts;
  }

  function readTreeCache() {
    try {
      var raw = localStorage.getItem(TREE_CACHE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data.t !== "number" || Date.now() - data.t > TREE_CACHE_TTL) return null;
      if (!Array.isArray(data.posts) || !data.posts.length) return null;
      return data.posts;
    } catch (e) { return null; }
  }
  function writeTreeCache(posts) {
    try { localStorage.setItem(TREE_CACHE_KEY, JSON.stringify({ t: Date.now(), posts: posts })); } catch (e) {}
  }

  /* una sola llamada: el árbol completo del repo */
  function viaTrees() {
    return fetch(TREE_API, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (tree) {
        var entries = (tree && Array.isArray(tree.tree)) ? tree.tree : [];
        var mdRe = new RegExp("^" + POSTS_PATH + "/([^/]+)/(\\d{4}-\\d{2}-\\d{2}(?:-[a-z0-9\\-]+)?)\\.md$", "i");
        var bnRe = new RegExp("^" + POSTS_PATH + "/([^/]+)/assets/(banner\\.(?:png|jpe?g|webp|gif|svg))$", "i");
        var posts = {}, banners = {};
        entries.forEach(function (it) {
          var p = String((it && it.path) || ""), m;
          if ((m = p.match(mdRe))) {
            /* si una carpeta tuviera varios .md, manda el más reciente */
            if (!posts[m[1]] || posts[m[1]].file < m[2] + ".md") {
              posts[m[1]] = { slug: m[1], file: m[2] + ".md", banner: "" };
            }
          } else if ((m = p.match(bnRe))) {
            banners[m[1]] = m[2];
          }
        });
        var list = [];
        Object.keys(posts).forEach(function (slug) {
          posts[slug].banner = banners[slug] || "";
          list.push(posts[slug]);
        });
        if (!list.length) throw new Error("sin entradas en el árbol");
        sortPosts(list);
        writeTreeCache(list);
        return list;
      });
  }

  /* manifiesto de respaldo: acepta {"slug","file"} y el formato
     antiguo de nombres "2026-09-15-titulo.md" */
  function viaManifest(localDir) {
    return fetchText(localDir + "/posts.json").then(function (text) {
      var raw = (JSON.parse(text).posts || []);
      var list = [];
      raw.forEach(function (entry) {
        if (entry && typeof entry === "object") {
          if (entry.slug && /^\d{4}-\d{2}-\d{2}(-[a-z0-9\-]+)?\.md$/i.test(entry.file || "")) {
            list.push({ slug: String(entry.slug), file: String(entry.file), banner: entry.banner || "" });
          }
          return;
        }
        var m = String(entry).match(/^(\d{4}-\d{2}-\d{2})-([a-z0-9\-]+)\.md$/i);
        if (m) list.push({ slug: m[2], file: m[1] + ".md", banner: "" });
      });
      return sortPosts(list);
    });
  }

  function fetchPosts(localDir) {
    var cached = readTreeCache();
    if (cached) return Promise.resolve({ posts: cached, optimistic: false });
    return viaTrees()
      .then(function (posts) { return { posts: posts, optimistic: false }; })
      .catch(function () {
        return viaManifest(localDir).then(function (posts) { return { posts: posts, optimistic: true }; });
      });
  }

  /* ============================================================
     MODO ÍNDICE (/blog): revista — banner o portada de color, la
     última entrada destacada a todo lo ancho
     ============================================================ */
  var listEl = document.querySelector(".md-list");
  if (listEl) {
    var apiDir = listEl.getAttribute("data-api-dir") || POSTS_PATH;
    var localDir = (listEl.getAttribute("data-md-dir") || "/" + POSTS_PATH).replace(/\/+$/, "");
    var countEl = document.getElementById("mdCount");
    var optimistic = false;

    fetchPosts(localDir).then(function (res) {
      optimistic = res.optimistic;
      if (countEl) countEl.textContent = res.posts.length + (res.posts.length === 1 ? " entrada" : " entradas");
      if (!res.posts.length) throw new Error("vacío");
      return Promise.all(res.posts.map(function (post) {
        /* cada .md se pide primero en local (GitHub Pages también lo
           sirve) y, si falla, en raw.githubusercontent.com */
        return fetchText(localDir + "/" + post.slug + "/" + post.file)
          .catch(function () { return fetchText(RAW_BASE + apiDir + "/" + post.slug + "/" + post.file); })
          .then(function (md) { return { post: post, md: md }; })
          .catch(function () { return null; }); /* una entrada rota no tumba el índice */
      }));
    }).then(function (items) {
      items = (items || []).filter(Boolean);
      if (!items.length) throw new Error("sin entradas");

      listEl.innerHTML = "";
      items.forEach(function (it, idx) {
        var p = it.post, md = it.md;
        var title = extractTitle(md) || p.slug.replace(/-/g, " ");
        var date = postDate(p.file) || "";
        var mins = readingMinutes(md);
        var excerpt = extractExcerpt(md);
        var bannerFile = p.banner || (optimistic ? "banner.png" : "");

        var a = document.createElement("a");
        a.className = "post-card" + (idx === 0 ? " featured" : "");
        a.href = postUrl(p.slug);
        a.style.animationDelay = (idx * 90) + "ms";

        var cover =
          '<span class="post-cover ' + coverClass(p.slug) + (bannerFile ? " has-img" : "") + '" aria-hidden="true">' +
          (bannerFile
            ? '<img class="cov-img" src="' + escapeHtml(localDir + "/" + p.slug + "/assets/" + bannerFile) + '" alt="" loading="lazy" decoding="async">'
            : "") +
          '<span class="cov-no">\u2116 ' + pad2(idx + 1) + "</span>" +
          '<span class="cov-pine">\uD83C\uDF51</span>' +
          "</span>";

        var head =
          '<span class="post-card-head">' +
          (idx === 0 ? '<span class="pill pill-brand">\u00DAltima entrada</span>' : "") +
          (date ? '<span class="pill">\uD83D\uDCC5 ' + escapeHtml(date) + "</span>" : "") +
          '<span class="pill">\u2615 ' + mins + " min</span>" +
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

      /* banner que falle al cargar → portada de degradado */
      Array.prototype.forEach.call(listEl.querySelectorAll(".cov-img"), function (img) {
        img.addEventListener("error", function () {
          var cov = img.closest(".post-cover");
          img.remove();
          if (cov) cov.classList.remove("has-img");
        });
      });
    }).catch(function () {
      if (countEl) countEl.textContent = "0 entradas";
      listEl.innerHTML =
        '<div class="notice" style="grid-column:1/-1;"><h3>Todavía no hay nada por aquí</h3>' +
        "<p>Cuando publiquemos la primera entrada, aparecerá aquí automáticamente.</p></div>";
    });
  }

  /* ============================================================
     MODO ENTRADA (/blog/<slug> o entrada.html?p=<slug>)
     ============================================================ */
  var postEl = document.getElementById("mdPost");
  if (postEl) {
    var apiDir2 = postEl.getAttribute("data-api-dir") || POSTS_PATH;
    var localDir2 = (postEl.getAttribute("data-md-dir") || "/" + POSTS_PATH).replace(/\/+$/, "");

    var params = new URLSearchParams(location.search);
    var slug = (params.get("p") || "").trim().replace(/\.md$/i, "");
    /* URL bonita: /blog/<slug> (404.html y serve.py la traen aquí) */
    if (!slug) {
      var pm = location.pathname.match(/\/blog\/([A-Za-z0-9\-]+)\/?$/);
      if (pm) slug = decodeURIComponent(pm[1]);
    }
    /* URL antigua con la fecha delante → URL limpia */
    var legacy = slug.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
    if (legacy) {
      slug = legacy[1];
      if (history.replaceState) history.replaceState(null, "", "/blog/" + encodeURIComponent(slug));
    }
    var VALID = /^[a-z0-9][a-z0-9\-]*$/i;

    var titleEl = document.getElementById("postTitle");
    var metaEl = document.getElementById("postMeta");
    var bannerEl = document.getElementById("postBanner");
    var pagerEl = document.getElementById("postPager");
    var shareBtn = document.getElementById("shareBtn");

    function renderError(msg) {
      postEl.innerHTML =
        '<div class="notice"><h3>Esta entrada no aparece</h3>' +
        "<p>" + escapeHtml(msg) + "</p>" +
        '<p style="margin-top:.6rem;"><a href="/blog">\u2190 Volver al blog</a></p></div>';
      if (titleEl) titleEl.textContent = "Entrada no encontrada";
      if (metaEl) metaEl.setAttribute("hidden", "");
      if (bannerEl) bannerEl.setAttribute("hidden", "");
      document.title = "Entrada no encontrada · Blog · Pineapple";
    }

    if (!VALID.test(slug)) {
      renderError("No hay ninguna entrada con esta dirección.");
    } else {
      fetchPosts(localDir2).then(function (res) {
        var post = null, idx = -1;
        for (var i = 0; i < res.posts.length; i++) {
          if (res.posts[i].slug === slug) { post = res.posts[i]; idx = i; break; }
        }
        if (!post) throw new Error("no está");
        return fetchText(localDir2 + "/" + post.slug + "/" + post.file)
          .catch(function () { return fetchText(RAW_BASE + apiDir2 + "/" + post.slug + "/" + post.file); })
          .then(function (md) {
            return { post: post, posts: res.posts, idx: idx, optimistic: res.optimistic, md: md };
          });
      }).then(function (data) {
        var post = data.post, md = data.md;
        var title = extractTitle(md) || post.slug.replace(/-/g, " ");
        var date = postDate(post.file) || "";
        var mins = readingMinutes(md);

        document.title = title + " · Blog · Pineapple";
        if (titleEl) titleEl.textContent = title;

        /* fecha, tiempo de lectura y autor bajo el titular */
        if (metaEl) {
          metaEl.innerHTML =
            (date ? '<span class="pill">\uD83D\uDCC5 ' + escapeHtml(date) + "</span>" : "") +
            '<span class="pill">\u2615 ' + mins + " min</span>" +
            '<span class="pill author">Por Pineapple</span>';
          metaEl.removeAttribute("hidden");
        }

        /* ---------- meta dinámicas: canonical, description, og y JSON-LD ---------- */
        var head = document.head || document.getElementsByTagName("head")[0];
        var desc = extractExcerpt(md) || "Una entrada del blog de Pineapple.";
        var absUrl = location.origin + "/blog/" + encodeURIComponent(post.slug);
        var dateIso = (String(post.file).match(/^\d{4}-\d{2}-\d{2}/) || [""])[0];

        function upsertMeta(attr, key, content) {
          var el = head.querySelector('meta[' + attr + '="' + key + '"]');
          if (!el) {
            el = document.createElement("meta");
            el.setAttribute(attr, key);
            head.appendChild(el);
          }
          el.setAttribute("content", content);
          return el;
        }

        if (head) {
          /* una entrada real es indexable (la plantilla /entrada no lo es) */
          var robots = head.querySelector('meta[name="robots"]');
          if (robots) robots.remove();

          /* canonical → la URL limpia de la entrada */
          var canonical = head.querySelector('link[rel="canonical"]');
          if (!canonical) {
            canonical = document.createElement("link");
            canonical.setAttribute("rel", "canonical");
            head.appendChild(canonical);
          }
          canonical.setAttribute("href", absUrl);

          upsertMeta("name", "description", desc);
          upsertMeta("property", "og:title", title);
          upsertMeta("property", "og:description", desc);
          upsertMeta("property", "og:url", absUrl);
          upsertMeta("property", "og:type", "article");
          if (dateIso) upsertMeta("property", "article:published_time", dateIso);
          upsertMeta("property", "og:image",
            post.banner ? location.origin + localDir2 + "/" + post.slug + "/assets/" + post.banner
                        : location.origin + "/assets/img/icon-512.png");

          /* datos estructurados para buscadores */
          var ld = head.querySelector('script[type="application/ld+json"]');
          if (!ld) {
            ld = document.createElement("script");
            ld.setAttribute("type", "application/ld+json");
            head.appendChild(ld);
          }
          ld.textContent = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: title,
            description: desc,
            datePublished: dateIso || undefined,
            dateModified: dateIso || undefined,
            image: [post.banner ? location.origin + localDir2 + "/" + post.slug + "/assets/" + post.banner
                                : location.origin + "/assets/img/icon-512.png"],
            inLanguage: "es",
            mainEntityOfPage: absUrl,
            author: { "@type": "Organization", name: "Pineapple", url: location.origin + "/" },
            publisher: { "@type": "Organization", name: "Pineapple", url: location.origin + "/" }
          });
        }

        /* banner de la entrada, si tiene (o se prueba, en modo manifiesto) */
        if (bannerEl) {
          var bFile = post.banner || (data.optimistic ? "banner.png" : "");
          if (bFile) {
            bannerEl.addEventListener("error", function () { bannerEl.setAttribute("hidden", ""); });
            bannerEl.addEventListener("load", function () {
              bannerEl.classList.add("show");
              /* el banner que carga es la mejor og:image */
              if (head) upsertMeta("property", "og:image", bannerEl.src);
            });
            bannerEl.src = localDir2 + "/" + post.slug + "/assets/" + bFile;
            bannerEl.removeAttribute("hidden");
          } else {
            bannerEl.setAttribute("hidden", "");
          }
        }

        /* el hero de la página ya pinta el titular: fuera el h1 del cuerpo */
        postEl.innerHTML = renderMarkdown(stripFirstHeading(md), makeResolver(post, localDir2));

        /* Compartir: copiar el enlace limpio */
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
          var newer = data.idx > 0 ? data.posts[data.idx - 1] : null;
          var older = data.idx < data.posts.length - 1 ? data.posts[data.idx + 1] : null;
          if (newer || older) {
            function cardOf(p, dir, label) {
              return (
                '<a class="pager-card ' + dir + '" href="' + postUrl(p.slug) + '">' +
                '<span class="dir">' + label + "</span>" +
                '<span class="t">' + escapeHtml(p.slug.replace(/-/g, " ")) + "</span></a>"
              );
            }
            pagerEl.innerHTML =
              (newer ? cardOf(newer, "prev", "\u2190 M\u00E1s reciente") : "<span></span>") +
              (older ? cardOf(older, "next", "M\u00E1s antigua \u2192") : "<span></span>");
            pagerEl.removeAttribute("hidden");

            /* títulos de verdad descargando las vecinas */
            [newer, older].forEach(function (np) {
              if (!np) return;
              fetchText(localDir2 + "/" + np.slug + "/" + np.file)
                .catch(function () { return fetchText(RAW_BASE + apiDir2 + "/" + np.slug + "/" + np.file); })
                .then(function (md2) {
                  var t = extractTitle(md2);
                  var link = pagerEl.querySelector('a[href="' + postUrl(np.slug) + '"] .t');
                  if (t && link) link.textContent = t;
                })
                .catch(function () {});
            });
          }
        }
      }).catch(function () {
        renderError("Puede que se haya borrado, renombrado o que la dirección esté mal escrita.");
      });
    }
  }
})();
