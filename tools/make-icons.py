#!/usr/bin/env python3
"""Gera todos os PNGs de ícone do Vida Brasil a partir de _build/icon-master.png.

Saídas:
  res/icon/android/{ldpi,mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}.png
  www/img/{pwa-192,pwa-512,favicon}.png
  _build/icon-rounded-512.png (ícone com cantos arredondados p/ lojas)

Uso: python3 tools/make-icons.py
"""
import os

from PIL import Image, ImageDraw

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MESTRE = os.path.join(RAIZ, "_build", "icon-master.png")

TAMANHOS = {
    os.path.join(RAIZ, "res", "icon", "android"): [
        ("ldpi.png", 36), ("mdpi.png", 48), ("hdpi.png", 72),
        ("xhdpi.png", 96), ("xxhdpi.png", 144), ("xxxhdpi.png", 192),
    ],
    os.path.join(RAIZ, "www", "img"): [
        ("pwa-192.png", 192), ("pwa-512.png", 512), ("favicon.png", 64),
    ],
}

ROUNDED = os.path.join(RAIZ, "_build", "icon-rounded-512.png")


def redimensionar(img, tamanho):
    return img.resize((tamanho, tamanho), Image.LANCZOS)


def cantos_arredondados(img, raio_pct=18):
    """Aplica cantos arredondados (estilo launcher)."""
    tamanho = img.size[0]
    raio = int(tamanho * raio_pct / 100)
    mascara = Image.new("L", (tamanho, tamanho), 0)
    desenho = ImageDraw.Draw(mascara)
    desenho.rounded_rectangle([0, 0, tamanho - 1, tamanho - 1], radius=raio, fill=255)
    saida = img.convert("RGBA")
    saida.putalpha(mascara)
    return saida


def main():
    img = Image.open(MESTRE).convert("RGB")
    lado = min(img.size)
    img = img.crop((
        (img.width - lado) // 2,
        (img.height - lado) // 2,
        (img.width + lado) // 2,
        (img.height + lado) // 2,
    ))

    for pasta, arquivos in TAMANHOS.items():
        os.makedirs(pasta, exist_ok=True)
        for nome, tamanho in arquivos:
            destino = os.path.join(pasta, nome)
            redimensionar(img, tamanho).save(destino, "PNG", optimize=True)
            print(f"  ✅ {os.path.relpath(destino, RAIZ)} ({tamanho}x{tamanho})")

    r = cantos_arredondados(redimensionar(img, 512))
    r.save(ROUNDED, "PNG", optimize=True)
    print(f"  ✅ {os.path.relpath(ROUNDED, RAIZ)} (512x512, cantos arredondados)")
    print("🎨 Ícones gerados com sucesso!")


if __name__ == "__main__":
    main()
