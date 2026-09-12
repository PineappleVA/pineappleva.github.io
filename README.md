# pineappleva.github.io

Portafolio oficial de **Pineapple** · *Making things a little bit better* 🍍

Web estática multipágina (HTML + CSS + JS, sin dependencias) que sirve como página
principal de la organización en `https://pineappleva.github.io/`.

## Páginas

| Página | Descripción |
| --- | --- |
| `index.html` | Portada: hero animado, valores, destacados, cifras y contacto |
| `proyectos.html` | Fichas detalladas: School Utilities, Y, Better Discovery, web oficial y Games |
| `juegos.html` | Catálogo de juegos: Dopamina, FNAS, iıRiS Games, Slop Central… |
| `comunidad.html` | Historia, valores, cómo trabajamos y cifras |
| `contacto.html` | Canales (email, X, YouTube, GitHub), formulario y FAQ |
| `404.html` | Página de error personalizada |

## Características

- 🍍 Estética de la marca: fondo oscuro cálido, acento ámbar `#f5a623` y tarjetas redondeadas
  (mismo sistema de diseño que [Pineapple Games](https://pineappleva.github.io/Games/)).
- ✨ Animaciones: entrada del hero, orbes de fondo, barra de progreso de scroll, máquina de
  escribir, contadores animados, efecto tilt 3D, cinta de palabras, brillo en botones y
  aparición suave al hacer scroll — todo respetando `prefers-reduced-motion`.
- 🇪🇸 Contenido en **español**.
- ♿ Accesible: HTML semántico, navegación por teclado, texto alternativo y foco visible.
- 📱 Responsive con menú móvil.
- 🔍 SEO: Open Graph, Twitter Cards, JSON-LD (Organization), `sitemap.xml` y `robots.txt`.
- 🚫 Sin frameworks, sin dependencias externas y sin cookies.

## Estructura

```
index.html              ← portada
proyectos.html          ← fichas de proyectos
juegos.html             ← catálogo de juegos
comunidad.html          ← historia y valores
contacto.html           ← contacto y FAQ
404.html                ← página de error
assets/css/style.css    ← estilos (paleta de marca)
assets/js/main.js       ← animaciones e interacciones (mínimo)
assets/img/             ← logos oficiales (pineapple, School Utilities, Y)
robots.txt · sitemap.xml
```

## Probar en local

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

## Enlaces de la organización

- GitHub: https://github.com/PineappleVA
- X (Twitter): https://x.com/pineapplevacorp
- YouTube: https://www.youtube.com/@pacorp-oficial
- Web oficial (clásica): https://sites.google.com/view/pacorp/inicio
- Contacto: pineapplevacorp@gmail.com
