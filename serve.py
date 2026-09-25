#!/usr/bin/env python3
"""
Servidor de desarrollo para pineappleva.github.io.

Imita el comportamiento de GitHub Pages + el enrutador de URLs limpias:
  · sirve los archivos reales (index.html, assets/..., blog/posts/*.md)
  · para cualquier ruta sin archivo (/proyectos, /blog/<slug>, ...)
    sirve 404.html con estado 404, igual que Pages; el enrutador de
    404.html hace el fetch-swap y deja la URL limpia en el navegador.

Uso:  python3 serve.py [puerto]   (por defecto 8080)
"""
import mimetypes
import pathlib
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = pathlib.Path(__file__).resolve().parent
NOT_FOUND = ROOT / "404.html"

mimetypes.add_type("text/markdown", ".md")
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("image/svg+xml", ".svg")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _is_real_file(self):
        p = pathlib.Path(self.translate_path(self.path))
        if p.is_dir():
            p = p / "index.html"
        return p.is_file()

    def _send_404(self, with_body=True):
        body = NOT_FOUND.read_bytes()
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        if with_body:
            self.wfile.write(body)

    def do_GET(self):
        if self._is_real_file():
            return super().do_GET()
        self._send_404(with_body=True)

    def do_HEAD(self):
        if self._is_real_file():
            return super().do_HEAD()
        self._send_404(with_body=False)

    def log_message(self, fmt, *args):  # log compacto
        sys.stderr.write("· %s\n" % (fmt % args))


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    srv = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"· Sirviendo {ROOT} en http://0.0.0.0:{port} (rutas limpias + 404.html)")
    srv.serve_forever()
