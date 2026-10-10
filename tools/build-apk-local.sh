#!/usr/bin/env bash
# ============================================================
# 🚗 Vida Brasil — build do APK SEM Android SDK
#
# Gera um APK Android assinado (v1+v2) a partir da pasta www/
# usando:
#   • template WebView (apkjs/base.apk, via npm registry)
#   • apktool (recompila recursos) + Java via jdk4py (pip)
#   • assinatura em Python puro (tools/sign-apk.py)
#
# Requisitos: python3 + pip (cryptography, pillow, jdk4py) e curl.
# Uso:  bash tools/build-apk-local.sh
# APK final: _build/out/vida-brasil-v1.0.0.apk
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."
RAIZ="$(pwd)"
VENDOR="$RAIZ/_build/vendor"
DECODED="$RAIZ/_build/decoded"
OUT="$RAIZ/_build/out"
VERSAO="1.0.0"
JAVA=/usr/local/lib/python3.11/dist-packages/jdk4py/java-runtime/bin/java

echo "📦 [1/6] Dependências Python (cryptography, pillow, jdk4py)…"
python3 - <<'PY' || pip3 install --break-system-packages -q cryptography pillow jdk4py
import cryptography, PIL, jdk4py  # noqa
PY

echo "📥 [2/6] Baixando ferramentas (apktool + template + keystore) do npm…"
mkdir -p "$VENDOR"
if [ ! -f "$VENDOR/apktool.jar" ]; then
  TMP=$(mktemp -d)
  curl -sL -o "$TMP/apkjs.tgz" "https://registry.npmjs.org/apkjs/-/apkjs-1.0.0.tgz"
  tar xzf "$TMP/apkjs.tgz" -C "$TMP"
  cp "$TMP/package/dist/apktool.jar" "$VENDOR/apktool.jar"
  cp "$TMP/package/dist/base.apk" "$VENDOR/base.apk"
  rm -rf "$TMP"
fi

echo "🔓 [3/6] Decodificando o template WebView…"
rm -rf "$DECODED"
"$JAVA" -jar "$VENDOR/apktool.jar" d -f -o "$DECODED" "$VENDOR/base.apk" >/dev/null

echo "🎮 [4/6] Injetando o jogo, nome e ícones…"
cp "$RAIZ/www/index.html" "$DECODED/assets/index.html"
cp -r "$RAIZ/www/css" "$RAIZ/www/js" "$RAIZ/www/img" "$DECODED/assets/"
sed -i 's|<string name="app_name">[^<]*</string>|<string name="app_name">Vida Brasil</string>|' \
  "$DECODED/res/values/strings.xml"
python3 - "$DECODED" <<'PY'
import sys
from PIL import Image
import os
base = sys.argv[1]
img = Image.open(os.path.join(base, "..", "icon-master.png")).convert("RGB")
lado = min(img.size)
img = img.crop(((img.width-lado)//2, (img.height-lado)//2,
                (img.width+lado)//2, (img.height+lado)//2))
for dpi, size in {"mdpi":108,"hdpi":162,"xhdpi":216,"xxhdpi":324,"xxxhdpi":432}.items():
    pasta = os.path.join(base, f"res/mipmap-{dpi}")
    os.makedirs(pasta, exist_ok=True)
    img.resize((size, size), Image.LANCZOS).save(
        os.path.join(pasta, "appicon.webp"), "WEBP", quality=90)
print("  ícones webp gerados")
PY
sed -i "s|  renameManifestPackage: .*|  renameManifestPackage: br.com.vidabrasil.game|; s|  versionName: '.*'|  versionName: '$VERSAO'|" "$DECODED/apktool.yml"

echo "🔨 [5/6] Recompilando APK (apktool)…"
mkdir -p "$OUT"
"$JAVA" -jar "$VENDOR/apktool.jar" b "$DECODED" -o "$OUT/vida-brasil-unsigned.apk" >/dev/null

echo "🔏 [6/6] Assinando (v1+v2, Python puro)…"
python3 "$RAIZ/tools/sign-apk.py" \
  "$OUT/vida-brasil-unsigned.apk" \
  "$OUT/vida-brasil-v$VERSAO.apk" \
  --key "$RAIZ/tools/vida-brasil-debug-key.pem" \
  --cert "$RAIZ/tools/vida-brasil-debug-cert.pem"

echo ""
echo "🎉 Pronto: $OUT/vida-brasil-v$VERSAO.apk"
echo "   Verificação independente: apksigtool verify $OUT/vida-brasil-v$VERSAO.apk"
