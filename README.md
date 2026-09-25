# pineappleva.github.io

Portafolio oficial de **Pineapple** · *Making things a little bit better* 🍍

Web estática multipágina (HTML + CSS + JS, sin frameworks) publicada en
`https://pineappleva.github.io/`.

## Páginas

| Página | Descripción |
| --- | --- |
| `index.html` | Portada: typing SVG, colegios, lo publicado, cifras |
| `proyectos.html` | Fichas: School Utilities, Y, Better Discovery y Games |
| `juegos.html` | Escaparate del catálogo: cada juego enlaza a su página de Pineapple Games |
| `blog.html` | Índice del blog (tarjetas-resumen) |
| `entrada.html` (se ve en `/blog/<slug>`) | Página individual de cada entrada del blog |
| `comunidad.html` | Historia, valores, cómo trabajamos y stats de GitHub |
| `equipo.html` | El equipo (Jaime, David + huecos libres) y solicitud para unirse |
| `contacto.html` | Canales, formulario y FAQ |
| `404.html` | Página de error **+ enrutador de URLs limpias** |

Navegación: **Inicio · Blog · Información ▾** (Proyectos, Juegos, Comunidad, Equipo, Contacto).

## 📝 Blog (cómo funciona por dentro)

El mismo sistema que los anuncios de [Pineapple Games](https://pineappleva.github.io/Games/anuncios/):
**sube una carpeta y aparece solo**, ahora con assets propios por entrada.

1. Crea una carpeta en `blog/posts/` con el título de la entrada:
   `blog/posts/mi-entrada/`
2. Dentro, un Markdown cuyo nombre empiece por la fecha:
   `blog/posts/mi-entrada/2026-09-15.md` (la fecha del nombre manda en el orden)
3. Si quieres portada, añade `assets/banner.png` dentro de la carpeta: se
   muestra en la tarjeta del índice y en el hero de la entrada. Cualquier otra
   imagen en `assets/` se puede insertar en el texto:
   `![pie de foto](assets/lo-que-sea.png)` (las imágenes sueltas con texto alt
   se convierten en `<figure>` con pie de foto)
4. Escríbelo en Markdown (títulos `#`, listas, **negritas**, *cursivas*,
   `código`, citas `>`, enlaces, separadores `---`)
5. Push → aparece en el índice de `blog.html` y en su página con URL limpia:
   `https://pineappleva.github.io/blog/mi-entrada`

```
blog/posts/
  posts.json                    ← manifiesto de respaldo
  septiembre-ya-esta-aqui/
    2026-09-15.md               ← la entrada (la fecha manda)
    assets/banner.png           ← portada de tarjeta + hero
```

Pipeline técnico (`assets/js/blog.js`):

- **Listado**: UNA llamada a la API de GitHub (`git/trees?recursive=1`) trae el
  árbol completo del repo: de ahí salen las carpetas de `blog/posts/`, el `.md`
  de cada una y si tiene `assets/banner.*`. Se cachea en `localStorage` media
  hora para no chocar con el límite de la API.
- **Fallback**: si la API falla (límite de peticiones, sin conexión), se lee el
  manifiesto `blog/posts/posts.json` (acepta el formato nuevo y el antiguo de
  nombres con fecha).
- **Descarga**: el `.md` se pide primero al propio sitio (GitHub Pages sirve los
  archivos tal cual) y, si falla, a `raw.githubusercontent.com` (rama `main`).
- **Orden**: descendente por la fecha del nombre del `.md`.
- **Render**: mini-Markdown propio y seguro. Primero se escapa **todo** el HTML
  (`& < > "`) y después se convierte el subconjunto soportado. No se puede
  inyectar HTML. Las rutas relativas (`assets/…`) se resuelven a la carpeta de
  la entrada; los `h2`–`h4` reciben `id` para enlazarlos (`#ancla`); los
  párrafos con líneas partidas se re-unen con espacios y las listas agrupan sus
  líneas de continuación en el mismo `<li>`.
- **Portadas**: si la entrada tiene `assets/banner.*`, la tarjeta del índice y
  el hero de la entrada lo muestran (con zoom suave al pasar el ratón); si no
  existe o falla la carga, se queda la portada de degradado de siempre.
- **Carga**: mientras llegan las entradas se ven *skeletons* animados en vez de
  un «Cargando…».
- **Extractos**: se lee el primer párrafo completo tras el título (enlaces
  convertidos a su texto) y se corta en un límite de palabra con elipsis.
- **Índice** (`/blog`): estilo revista — cada entrada con su portada (banner o
  degradado propio) y número de edición; la más reciente va destacada a todo lo
  ancho. Fecha, tiempo de lectura (~180 palabras/min) y extracto.
- **URLs limpias** (todo el sitio sin `.html`): los enlaces internos apuntan a
  `/proyectos`, `/juegos`, `/blog`, `/blog/<slug>`, `/comunidad`, `/equipo`,
  `/contacto`… En GitHub Pages esas rutas no existen → Pages sirve `404.html`,
  cuyo enrutador hace *fetch-swap*: trae la página real con `fetch`, sustituye
  el documento y deja la URL limpia con `replaceState` (sin recargas ni saltos
  a `.html`). El `?p=<slug>` directo de `entrada.html` sigue funcionando como
  respaldo, siempre validado (solo letras, números y guiones).
- **Compatibilidad**: las URL antiguas con la fecha delante
  (`/blog/2026-09-15-titulo`) se redirigen solas a la limpia (`/blog/titulo`).
- **Entrada** (`/blog/<slug>`): hero con titular, fecha, tiempo de lectura,
  autor y banner; artículo a medida con imágenes con pie de foto, botón
  «Compartir» (copiar enlace) y navegación Anterior/Siguiente.
- **Meta dinámicas** (`blog.js`): al renderizar una entrada se actualizan
  `canonical` (a la URL limpia), `description` (el extracto), `og:*`
  (título, descripción, URL, imagen = banner) y se añade JSON-LD
  `BlogPosting`. La plantilla `entrada.html` lleva `noindex` para no
  indexarse a secas; el enrutador del 404 y el render lo retiran cuando
  la página es una entrada de verdad.
- **Indexabilidad real** (`.github/workflows/blog-pages.yml`): GitHub Pages
  serviría `/blog/<slug>` con estado 404 (y Google no indexa un 404), así
  que un workflow genera `blog/<slug>/index.html` (copia indexable de
  `entrada.html`) cada vez que cambian las entradas. Con eso la URL
  limpia responde 200 y el sitemap no da errores en Search Console.
- **Sitemap** (`sitemap.xml`): todas las páginas y las entradas, con
  `lastmod` (la fecha del `.md` para las entradas).
- **Entidad «Pineapple VA»** (para buscadores y motores de respuestas con IA):
  `Organization` JSON-LD en el índice con `alternateName` (Pineapple/PineappleVA),
  descripción y `sameAs` a GitHub/X/YouTube; `FAQPage` JSON-LD en Contacto;
  `llms.txt` en la raíz con el resumen de quién somos y qué hacemos; y
  `robots.txt` que da la bienvenida explícita a los crawlers de IA (GPTBot,
  ClaudeBot, PerplexityBot…). Títulos y `og:site_name` usan «Pineapple VA».
- **Juegos → Pineapple Games**: `juegos.html` es el escaparate; cada tarjeta enlaza
  a su página del hub (y el deep-link `/juegos?g=<id>` redirige allí directamente
  mediante el mapa de `assets/js/main.js`).

## 🌗 Tema claro y oscuro (cómo funciona por dentro)

- El tema se decide **antes de pintar** con un script inline en el `<head>` de cada página:
  1. Si existe `localStorage['pa-theme']` (`light`/`dark`), se usa ese.
  2. Si no, se respeta `prefers-color-scheme` del sistema.
  3. Si nada de lo anterior, oscuro (el de la marca).
- Todo el color vive en **variables CSS**: `:root` define el tema oscuro y
  `html[data-theme="light"]` lo sobreescribe (papel crema con acentos ámbar).
- Detalles de adaptación del tema claro:
  - El logo de la piña es blanco, así que en claro se invierte con `filter: invert(1)`.
  - Los *tiles* de logos (`school-utilities.png`, `y.png`) **siguen siendo negros** en claro:
    los logos son blancos y usan `mix-blend-mode: screen`.
  - Las insignias de estado tienen colores específicos por tema (legibilidad).
  - El botón alterna sol/luna con CSS (`html[data-theme]`) y guarda en `localStorage`.
  - `meta name="theme-color"` cambia al alternar (color del navegador móvil).

## 🧼 Capa de diseño «minimal»

Sobre los estilos base hay una **capa final** en `assets/css/style.css`
(buscad `MINIMAL · capa de estilo`) que redefine el lenguaje visual sin tocar
los componentes originales — en empates de especificidad gana por ir después:

- **Tipografía**: Space Grotesk para todo y Archivo Black reservado a la
  palabra grande del hero, vía Google Fonts con `display=swap`.
- **Superficies tranquilas**: bordes de 1px, radios generosos (10–14px) y
  sombras suaves que solo aparecen al pasar el ratón.
- **Un solo acento**: el ámbar de la marca (botón primario, activo del menú,
  foco de los formularios, hover de las tarjetas).
- **Tema claro** blanco cálido (`#fafaf7`); el oscuro es el de la marca.
- Los emoji de interfaz se retiraron (la piña 🍍 queda solo como marca) y los
  tiles de juegos son letras sobre colores planos.

## 🌊 Olas (cómo funcionan por dentro)

Dos capas de **seno real** (generado punto a punto, sin quebradas), estilo
`capsule-render` `waving` del README:

- Cada capa es una pista HTML `.wave-track` de **200% de ancho** con el patrón
  SVG repetido dos veces (un periodo de 1440 por SVG). La animación es
  `translateX(-50%)`: al ser un **porcentaje**, equivale siempre a exactamente un
  periodo en cualquier ancho de pantalla (el fallo anterior era animar en píxeles
  fijos, que rompía el bucle según el viewport).
- Capa trasera: otra seno con fase desplazada y amplitud menor, al 35% de
  opacidad y en dirección contraria → sensación de oleaje con profundidad.
- El degradado es **periódico** (ámbar→amarillo→ámbar→amarillo→ámbar a lo largo
  de un periodo) para que el color también cicre sin salto.
- En la portada hay además una onda divisoria suave (`.wave-soft`) rellena con
  `var(--bg-deep)` que se adapta al tema.
- Con `prefers-reduced-motion: reduce` la animación se apaga.

## 🧩 Todo autocontenido (por qué no hay servicios externos)

Los servicios de imágenes del perfil (typing SVG, shields.io, github-readme-stats)
fallan a menudo (rate limits o caídas), así que se sustituyeron por equivalentes
locales que **siempre se renderizan**:

- **Titular del hero**: pegatina a rotulador (`Caveat`) + nombre póster en
  `Archivo Black` con subrayado ondulado SVG, sin efectos de máquina de escribir.
- **Insignias** (`.x-badge`): dos segmentos HTML/CSS con los colores de cada
  plataforma, mismo look `for-the-badge`.
- **Estadísticas de GitHub** (`.gh-card`): tarjetas HTML/CSS con filas de datos y
  barra de lenguajes, adaptadas a ambos temas.

## 🎮 Juegos embebidos

`juegos.html` carga cada juego en un `iframe` solo cuando pulsas «Jugar aquí»
(`data-game="URL"` en el botón; `assets/js/main.js` lo conecta). Botón «Expulsar juego»
para descargar el iframe. Los juegos viven en su casa, Pineapple Games; aquí se embeben.

## 👥 Equipo

`equipo.html`, con la gente de la web de la organización: **Jaime** (programación y YouTube),
**Nerea**, **Adrian** y **David**, más dos huecos libres y el botón para **unirse al equipo**
(formulario de solicitud). Todo lo enlazado es público.

## Notas de contenido

- **School Utilities** se presenta como disponible **solo en Safa-Grial**: todavía no se ha
  centrado el producto en otros colegios (así se indica en portada, ficha, FAQ y cifras).
- La web anterior de Google Sites **no se menciona**: esto es una migración directa.

## Resto de características

- ✨ Animaciones: orbes, barra de progreso, contadores, tilt 3D, cinta de palabras
  con fundido en los bordes, brillo en botones, aparición al hacer scroll con
  easing común (`--ease`) y aperturas con fundido (desplegable, menú móvil, pager,
  FAQ) — todo respeta `prefers-reduced-motion`.
- 📐 Layout editorial: contenedor de 1120px, secciones de 5rem de aire, héroes y
  títulos alineados a la izquierda con filete ámbar y regla inferior; el centro
  se reserva para lo que de verdad es central (404, algunos formularios).
- 🇪🇸 Contenido en español.
- ♿ HTML semántico, navegación por teclado, foco visible, desplegable accesible
  (`aria-expanded`, cierre con Escape/clic fuera).
- 🔍 SEO: Open Graph, Twitter Cards, JSON-LD, `sitemap.xml`, `robots.txt`, `llms.txt` y entidad «Pineapple VA» para las respuestas de IA.
- 🚫 Sin frameworks ni dependencias de paquetería.

## Estructura

```
index.html · proyectos.html · juegos.html · comunidad.html · equipo.html · contacto.html · 404.html
blog.html              ← índice del blog
entrada.html           ← plantilla de entrada (se sirve en /blog/<slug>)
blog/posts/*.md        ← entradas (AAAA-MM-DD-titulo.md)
blog/posts/posts.json  ← manifiesto de respaldo
assets/css/style.css   ← estilos (temas dark/light por variables)
assets/js/main.js      ← tema, menú, desplegable, progreso, contadores, redirección ?g=
assets/js/blog.js      ← pipeline Markdown: índice + página de entrada
assets/img/            ← logos oficiales
robots.txt · sitemap.xml · llms.txt
```

## Probar en local

```bash
python3 serve.py 8080
# → http://localhost:8080  (con rutas limpias: /proyectos, /blog/<slug>…)
```

`serve.py` imita a GitHub Pages: los archivos reales se sirven tal cual y cualquier
ruta sin archivo recibe `404.html` (estado 404), igual que producción — el enrutador
del navegador completa el resto. En local, el blog usa `posts.json` (la API lista la
rama `main`, que es la publicada).

## Enlaces de la organización

- GitHub: https://github.com/PineappleVA
- X (Twitter): https://x.com/pineapplevacorp
- YouTube: https://www.youtube.com/@pacorp-oficial
- Contacto: pineapplevacorp@gmail.com
