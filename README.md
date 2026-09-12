# pineappleva.github.io

Portafolio oficial de **Pineapple** · *Making things a little bit better* 🍍

Web estática multipágina (HTML + CSS + JS, sin frameworks) publicada en
`https://pineappleva.github.io/`.

## Páginas

| Página | Descripción |
| --- | --- |
| `index.html` | Portada: typing SVG, colegios, lo publicado, cifras |
| `proyectos.html` | Fichas: School Utilities, Y, Better Discovery y Games |
| `juegos.html` | Juegos jugables en la propia página (iframe) + catálogo |
| `blog.html` | Índice del blog (tarjetas-resumen) |
| `entrada.html?p=…` | Página individual de cada entrada del blog |
| `comunidad.html` | Historia, valores, cómo trabajamos y stats de GitHub |
| `equipo.html` | El equipo (Jaime, Nerea, Adrian, David + huecos) y solicitud para unirse |
| `contacto.html` | Canales, formulario y FAQ |
| `404.html` | Página de error |

Navegación: **Inicio · Blog · Información ▾** (Proyectos, Juegos, Comunidad, Equipo, Contacto).

## 📝 Blog (cómo funciona por dentro)

El mismo sistema que los anuncios de [Pineapple Games](https://pineappleva.github.io/Games/anuncios/):
**sube un Markdown y aparece solo**, ahora con página propia por entrada.

1. Crea un archivo en `blog/posts/` llamado `AAAA-MM-DD-titulo.md`
2. Escríbelo en Markdown (títulos `#`, listas, **negritas**, *cursivas*, `código`,
   citas `>`, imágenes `![alt](url)`, separadores `---`)
3. Push → aparece en el índice de `blog.html` y en `entrada.html?p=AAAA-MM-DD-titulo.md`

Pipeline técnico (`assets/js/blog.js`):

- **Listado**: `GET api.github.com/repos/PineappleVA/pineappleva.github.io/contents/blog/posts?ref=main`
  → se filtran los `.md` (sin `readme.md` ni ocultos).
- **Fallback**: si la API falla (límite de peticiones, sin conexión), se lee el manifiesto
  `blog/posts/posts.json`.
- **Descarga**: cada `.md` se trae de `raw.githubusercontent.com` (rama `main`).
- **Orden**: descendente por nombre → la fecha del nombre manda.
- **Render**: mini-Markdown propio y seguro. Primero se escapa **todo** el HTML (`& < > "`)
  y después se convierte el subconjunto soportado. No se puede inyectar HTML.
- **Índice** (`blog.html`): tarjetas con fecha, tiempo de lectura (~180 palabras/min)
  y un extracto automático (la línea posterior al título).
- **Entrada** (`entrada.html`): carga el archivo del parámetro `?p=` (validado con el patrón
  `AAAA-MM-DD-[a-z0-9-].md`, sin acceso a rutas arbitrarias), actualiza el `<title>` de la
  página, muestra meta (fecha, lectura, firma), botón «copiar enlace» y navegación
  Anterior (más reciente) / Siguiente (más antigua).

## 🌗 Tema claro y oscuro (cómo funciona por dentro)

- El tema se decide **antes de pintar** con un script inline en el `<head>` de cada página:
  1. Si existe `localStorage['pa-theme']` (`light`/`dark`), se usa ese.
  2. Si no, se respeta `prefers-color-scheme` del sistema.
  3. Si nada de lo anterior, oscuro (el de la marca).
- Todo el color vive en **variables CSS**: `:root` define el tema oscuro y
  `html[data-theme="light"]` lo sobreescribe (blanco limpio con acentos ámbar).
- Detalles de adaptación del tema claro:
  - El logo de la piña es blanco, así que en claro se invierte con `filter: invert(1)`.
  - Los *tiles* de logos (`school-utilities.png`, `y.png`) **siguen siendo negros** en claro:
    los logos son blancos y usan `mix-blend-mode: screen`.
  - Las insignias de estado tienen colores específicos por tema (legibilidad).
  - El botón alterna sol/luna con CSS (`html[data-theme]`) y guarda en `localStorage`.
  - `meta name="theme-color"` cambia al alternar (color del navegador móvil).

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

- **Typing del hero**: efecto máquina de escribir en `assets/js/main.js`
  (`#typeline` + `data-words`), con caret parpadeante CSS.
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

- ✨ Animaciones: orbes, barra de progreso, contadores, tilt 3D, cinta de palabras,
  brillo en botones y aparición al hacer scroll — todo respeta `prefers-reduced-motion`.
- 🇪🇸 Contenido en español.
- ♿ HTML semántico, navegación por teclado, foco visible, desplegable accesible
  (`aria-expanded`, cierre con Escape/clic fuera).
- 🔍 SEO: Open Graph, Twitter Cards, JSON-LD, `sitemap.xml`, `robots.txt`.
- 🚫 Sin frameworks ni dependencias de paquetería.

## Estructura

```
index.html · proyectos.html · juegos.html · comunidad.html · equipo.html · contacto.html · 404.html
blog.html              ← índice del blog
entrada.html           ← página de cada entrada (?p=nombre.md)
blog/posts/*.md        ← entradas (AAAA-MM-DD-titulo.md)
blog/posts/posts.json  ← manifiesto de respaldo
assets/css/style.css   ← estilos (temas dark/light por variables)
assets/js/main.js      ← tema, menú, desplegable, progreso, contadores, tilt, reproductor
assets/js/blog.js      ← pipeline Markdown: índice + página de entrada
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
- Contacto: pineapplevacorp@gmail.com
