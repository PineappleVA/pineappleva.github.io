# pineappleva.github.io

Portafolio oficial de **Pineapple** · *Making things a little bit better* 🍍

Web estática multipágina (HTML + CSS + JS, sin frameworks) publicada en
`https://pineappleva.github.io/`.

## Páginas

| Página | Descripción |
| --- | --- |
| `index.html` | Portada: typing SVG, valores, colegios, lo publicado y cifras |
| `proyectos.html` | Fichas: School Utilities, Y, Better Discovery, web clásica y Games |
| `juegos.html` | Juegos jugables en la propia página (iframe) + catálogo |
| `blog.html` | Blog en Markdown con selector de píldoras |
| `comunidad.html` | Historia, valores, equipo, cómo trabajamos y stats de GitHub |
| `contacto.html` | Canales, formulario y FAQ |
| `404.html` | Página de error |

## 🌗 Tema claro y oscuro (cómo funciona por dentro)

- El tema se decide **antes de pintar** con un script inline en el `<head>` de cada página:
  1. Si existe `localStorage['pa-theme']` (`light`/`dark`), se usa ese.
  2. Si no, se respeta `prefers-color-scheme` del sistema.
  3. Si nada de lo anterior, oscuro (el de la marca).
- Todo el color vive en **variables CSS**: `:root` define el tema oscuro y
  `html[data-theme="light"]` lo sobreescribe. Nada de clases repartidas por el HTML.
- Detalles de adaptación del tema claro:
  - El logo de la piña es blanco, así que en claro se invierte con `filter: invert(1)`.
  - Los *tiles* de logos (`school-utilities.png`, `y.png`) **siguen siendo negros** en claro:
    los logos son blancos y usan `mix-blend-mode: screen`.
  - Las insignias de estado tienen colores específicos por tema (legibilidad).
  - El botón alterna sol/luna con CSS (`html[data-theme]`) y guarda en `localStorage`.
  - `meta name="theme-color"` cambia al alternar (color del navegador móvil).

## 📝 Blog (cómo funciona por dentro)

El mismo sistema que los anuncios de [Pineapple Games](https://pineappleva.github.io/Games/anuncios/):
**sube un Markdown y aparece solo**.

1. Crea un archivo en `blog/posts/` llamado `AAAA-MM-DD-titulo.md`
2. Escríbelo en Markdown (títulos `#`, listas, **negritas**, *cursivas*, `código`,
   citas `>`, imágenes `![alt](url)`, separadores `---`)
3. Push → aparece en `blog.html`, ordenado de más nuevo a más viejo

Pipeline técnico (`assets/js/blog.js`):

- **Listado**: `GET api.github.com/repos/PineappleVA/pineappleva.github.io/contents/blog/posts?ref=main`
  → se filtran los `.md` (sin `readme.md` ni ocultos).
- **Fallback**: si la API falla (límite de peticiones, sin conexión), se lee el manifiesto
  `blog/posts/posts.json`. Solo toca actualizarlo si no quieres depender de la API.
- **Descarga**: cada `.md` se trae de `raw.githubusercontent.com`.
- **Orden**: descendente por nombre → la fecha del nombre manda.
- **Render**: mini-Markdown propio y seguro. Primero se escapa **todo** el HTML
  (`& < > "`) y después se convierte el subconjunto soportado. No se puede inyectar HTML.
- **Selector de píldoras**: barra fija bajo el menú. Cada píldora hace scroll suave a su
  entrada; un `IntersectionObserver` marca la activa según la entrada visible. Deep-link
  con `#md-post-N`.
- **Extras por entrada**: fecha (del nombre), tiempo de lectura (~180 palabras/min) y firma.

## 🌊 Olas (cómo funcionan por dentro)

Réplica del `capsule-render` de tipo `waving` del README de la organización:

- Un único `<svg>` de `viewBox 2880×90` con el dibujo **repetido dos veces** (dos periodos
  de 1440). El `<g class="wave-move">` se desplaza con CSS `translateX(-1440px)` en bucle
  lineal; al completar un periodo el patrón coincide y el bucle es perfecto.
- Relleno con degradado `#f5a623 → #ffd166` (los colores del README), como
  `capsule-render.vercel.app/api?type=waving&height=80&section=footer&color=0:F5A623,100:FFD166`.
- En el pie la ola es el último elemento de la página (como en el README) y va en
  dirección contraria y más lenta (`.wave.slow`).
- Con `prefers-reduced-motion: reduce` la animación se apaga.

## 🎮 Juegos embebidos

`juegos.html` carga cada juego en un `iframe` solo cuando pulsas «Jugar aquí»
(`data-game="URL"` en el botón; `assets/js/main.js` lo conecta). Botón «Expulsar juego»
para descargar el iframe y no dejar nada corriendo. Los juegos viven en su casa,
Pineapple Games; aquí se embeben.

## 👥 Equipo

Sección en `comunidad.html` con el equipo real (sacado de los contributors públicos de
GitHub): **Jaime Gaming** (prácticamente todo el código), GitHub Copilot (sale en los
contributors de FNAS y Better Discovery) y las aulas de Valladolid como testers.

## Referencias

- Perfil de GitHub: typing SVG (`readme-typing-svg.demolab.com`), badges `shields.io`
  estilo `for-the-badge` y tarjetas `github-readme-stats` con los mismos colores.
- Web clásica: la sección «Somos los creadores de varios productos en muchos colegios
  de Valladolid» de la portada viene de la web antigua de Google Sites.

## Resto de características

- ✨ Animaciones: orbes, barra de progreso, contadores, tilt 3D, cinta de palabras,
  brillo en botones y aparición al hacer scroll — todo respeta `prefers-reduced-motion`.
- 🇪🇸 Contenido en español.
- ♿ HTML semántico, navegación por teclado, foco visible.
- 🔍 SEO: Open Graph, Twitter Cards, JSON-LD, `sitemap.xml`, `robots.txt`.
- 🚫 Sin frameworks ni dependencias de paquetería.

## Estructura

```
index.html · proyectos.html · juegos.html · comunidad.html · contacto.html · 404.html
blog.html              ← página del blog
blog/posts/*.md        ← entradas (AAAA-MM-DD-titulo.md)
blog/posts/posts.json  ← manifiesto de respaldo
assets/css/style.css   ← estilos (temas dark/light por variables)
assets/js/main.js      ← tema, menú, progreso, contadores, tilt, reproductor
assets/js/blog.js      ← pipeline Markdown del blog + selector de píldoras
assets/img/            ← logos oficiales
robots.txt · sitemap.xml
```

## Probar en local

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

En local, el blog usa `posts.json` (la API lista la rama `main`, que es la publicada).

## Enlaces de la organización

- GitHub: https://github.com/PineappleVA
- X (Twitter): https://x.com/pineapplevacorp
- YouTube: https://www.youtube.com/@pacorp-oficial
- Web oficial (clásica): https://sites.google.com/view/pacorp/inicio
- Contacto: pineapplevacorp@gmail.com
