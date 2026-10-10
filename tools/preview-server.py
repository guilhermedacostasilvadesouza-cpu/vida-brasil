#!/usr/bin/env python3
"""Servidor de pré-visualização do Vida Brasil (estático, simples).

Uso:  python3 tools/preview-server.py  [porta]   (padrão: 3000, 0.0.0.0)
"""
import http.server
import os
import socketserver
import sys

PORTA = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 3000))
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "www")

TIPOS = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".wasm": "application/wasm",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, **TIPOS}

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=os.path.abspath(RAIZ), **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("[preview] %s - %s\n" % (self.address_string(), fmt % args))


class Servidor(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with Servidor(("0.0.0.0", PORTA), Handler) as httpd:
        print(f"🚗 Vida Brasil rodando em http://0.0.0.0:{PORTA} (raiz: {os.path.abspath(RAIZ)})")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
