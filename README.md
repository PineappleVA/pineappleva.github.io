# pineappleva.github.io

Portafolio oficial de **Pineapple** · *Making things a little bit better* 🍍

Web estática multipágina (HTML + CSS + JS, sin dependencias) que sirve como página
principal de la organización en `https://pineappleva.github.io/`.

## Páginas

| Página | Descripción |
| --- | --- |
| `index.html` | Portada: hero con typing SVG, valores, lo publicado, cifras |
| `proyectos.html` | Fichas: School Utilities, Y, Better Discovery, web oficial y Games |
| `juegos.html` | Juegos jugables en la propia página (iframe) + catálogo |
| `blog.html` | Blog en Markdown con selector lateral (como los anuncios de Games) |
| `comunidad.html` | Historia, valores, cómo trabajamos y estadísticas de GitHub |
| `contacto.html` | Canales, formulario y FAQ |
| `404.html` | Página de error |

## 📝 Cómo publicar en el blog

El blog funciona igual que los anuncios de [Pineapple Games](https://pineappleva.github.io/Games/anuncios/):
**sube un Markdown y aparece solo**.

1. Crea un archivo en `blog/posts/` llamado `AAAA-MM-DD-titulo.md` (ej.: `2026-09-12-mi-entrada.md`)
2. Escríbelo en Markdown: `#` título, listas, **negritas**, *cursivas*, `código`, citas, imágenes...
3. Sube el cambio al repositorio y listo: aparece en `blog.html` ordenado de más nuevo a más viejo

- El **título** sale del primer `#` del archivo y la **fecha** del nombre.
- El listado se obtiene con la API de GitHub (`blog/posts`); si falla, usa el manifiesto
  `blog/posts/posts.json` como respaldo (actualízalo solo si la API no estuviera disponible).
- Renderizador: `assets/js/blog.js` (mini-Markdown seguro, subconjunto: encabezados, listas,
  citas, código, enlaces, imágenes, negritas, cursivas, hr).

## Características

- 🍍 Estética de la marca: fondo oscuro cálido, ámbar `#f5a623` y tarjetas redondeadas
  (mismo sistema de diseño que Pineapple Games).
- 🌊 Mareas animadas entre secciones y en el pie (desactivables con `prefers-reduced-motion`).
- 🐙 Elementos del perfil de GitHub: typing SVG, badges de shields.io y tarjetas
  `github-readme-stats` con los mismos colores.
- 🎮 Juegos embebidos en la propia web mediante iframe bajo demanda.
- ✨ Animaciones: orbes, barra de progreso, contadores, tilt 3D, cinta de palabras,
  brillo en botones y aparición al hacer scroll.
- 🇪🇸 Contenido en español.
- ♿ Accesible: HTML semántico, navegación por teclado y foco visible.
- 🔍 SEO: Open Graph, Twitter Cards, JSON-LD, `sitemap.xml` y `robots.txt`.
- 🚫 Sin frameworks ni dependencias de paquetería.

## Estructura

```
index.html · proyectos.html · juegos.html · comunidad.html · contacto.html · 404.html
blog.html              ← página del blog
blog/posts/*.md        ← entradas del blog (AAAA-MM-DD-titulo.md)
blog/posts/posts.json  ← manifiesto de respaldo
assets/css/style.css   ← estilos
assets/js/main.js      ← interacciones comunes
assets/js/blog.js      ← renderizado Markdown + selector lateral
assets/img/            ← logos oficiales
robots.txt · sitemap.xml
```

## Probar en local

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

En local el listado del blog usa `posts.json` (la API de GitHub lista la rama `main`,
que es la publicada).

## Enlaces de la organización

- GitHub: https://github.com/PineappleVA
- X (Twitter): https://x.com/pineapplevacorp
- YouTube: https://www.youtube.com/@pacorp-oficial
- Web oficial (clásica): https://sites.google.com/view/pacorp/inicio
- Contacto: pineapplevacorp@gmail.com
