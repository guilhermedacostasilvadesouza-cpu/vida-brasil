# 🚗 Vida Brasil

**O jogo da vida cotidiana brasileira** — dirija, economize, complete missões, acerte o quiz de trânsito e vire o mestre do volante. 100% offline, sem cadastro, em português.

<p align="center">
  <img src="_build/icon-rounded-512.png" width="128" alt="Ícone do Vida Brasil">
</p>

## 🎮 O que tem no jogo

| Recurso | Descrição |
|---|---|
| 🗺️ **Rotas e viagens** | 6 rotas (da padaria à interestadual) com imprevistos aleatórios: buracos, multas, pedágios, sorte… |
| ⛽ **Posto de combustível** | Gasolina, álcool, diesel e GNV com preços que variam todo dia. Regra do álcool × gasolina incluída! |
| 💰 **Economia real** | Carteira, cesta básica no mercado e simulador de troca de carro (custo mensal por km/L). |
| 📝 **Quiz de trânsito** | 12 perguntas com explicação da lei (CTB) + **Quiz do SAMU (192)**. |
| 🗓️ **Missões semanais** | 6 missões que viram a semana com bônus em dinheiro e XP. |
| 🏆 **Conquistas** | 12 medalhas, do "Primeiro volante" ao "Herói do 192". |
| 🎮 **Minigame SinalVida** | Ação infinita desviando do trânsito caótico, com recordes. |
| ☎️ **Telefones de emergência** | 190, 192, 193, 180, 181 e 199 — úteis até na vida real. |

Níveis, XP, sons (WebAudio, sem arquivos), confete, progresso salvo no aparelho (localStorage).

## 📲 Instalar o APK no Android

**Download direto:** vá na aba **[Releases](../../releases)** e baixe `vida-brasil-v1.0.0.apk`.

1. Baixe o APK no celular (ou copie por cabo/nuvem).
2. Toque no arquivo e permita "instalar apps de fontes desconhecidas".
3. Pronto: **Vida Brasil** instalado, com ícone próprio e 100% offline. 🎉

| Detalhe | Valor |
|---|---|
| Pacote | `br.com.vidabrasil.game` |
| Versão | 1.0.0 (versionCode 1) |
| Compatibilidade | Android 5.0+ (minSdk 21, targetSdk 31) |
| Permissões | **nenhuma** — funciona 100% offline |
| Assinaturas | v1 (JAR) + v2 (APK Signature Scheme), chave debug incluída no repo |

> O APK é assinado com a **chave debug** versionada em `tools/` — instalável em
> qualquer aparelho. Para publicar na Play Store, gere uma chave de produção e
> assine o `vida-brasil-unsigned.apk` com ela.

## ⚡ Build automático via GitHub Actions (opcional)

Existe um pipeline pronto em **`ci/build-apk.yml`** que gera o APK no Actions.
Como o envio de arquivos de workflow exige permissão especial no GitHub, ele
não está em `.github/workflows/` — para ativar, copie o arquivo para lá pela
interface web (Add file → Create new file → cole o conteúdo → commit). O build
dispara a cada push e o APK aparece em **Actions → Artifacts**.

### Build local (sem Android SDK!)

```bash
bash tools/build-apk-local.sh
# → _build/out/vida-brasil-1.0.0.apk (assinado v1+v2)
```

O script baixa sozinho o template WebView + apktool (npm), usa Java via
`jdk4py` (pip) e assina em Python puro (`tools/sign-apk.py`). Valide com:

```bash
apksigtool verify _build/out/vida-brasil-1.0.0.apk   # "v2 verified"
```


## 🛠️ Rodar na web (PWA)

O jogo também roda em qualquer navegador (celular ou PC), instalável como app:

```bash
python3 tools/preview-server.py     # http://localhost:3000
# ou
npm start
```

## 📦 Build local do APK (opcional)

Requisitos: Node 20+, Java 17 (Temurin), Android SDK 34.

```bash
npm install -g cordova@12
cordova platform add android@13
cordova build android --debug
# APK em: platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

Ou simplesmente: `npm run build:apk`

## 🗂️ Estrutura

```
├── www/                  # 100% do jogo (HTML + CSS + JS puro)
│   ├── index.html
│   ├── css/styles.css
│   ├── js/game.js
│   ├── manifest.webmanifest
│   ├── sw.js             # cache offline (PWA)
│   └── img/              # ícones gerados
├── res/icon/android/     # ícones por densidade (APK)
├── tools/
│   ├── make-icons.py     # gera os PNGs a partir de _build/icon-master.png
│   └── preview-server.py # servidor de preview
├── _build/               # ícone mestre (fonte dos demais) + teste de fumaça
├── ci/build-apk.yml      # pipeline opcional do APK (ver README, seção Actions)
├── config.xml            # config do Cordova (id, nome, ícones)
```

## 🧪 Stack

- **Jogo**: HTML5 + CSS3 + JavaScript vanilla (zero dependências em runtime)
- **APK**: WebView nativa (template apkjs) + apktool + assinador Python próprio (`tools/sign-apk.py`, validado no apksigtool/apksig)
- **CI**: GitHub Actions opcional → APK automático (ver README)

## 📄 Licença

MIT — jogue, modifique e compartilhe. 🇧🇷
