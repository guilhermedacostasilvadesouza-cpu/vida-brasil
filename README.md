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

1. Vá em **[Actions → Build APK (Android)](../../actions/workflows/build-apk.yml)** e abra o run mais recente; **ou** pegue direto na aba **[Releases](../../releases)**.
2. Baixe o artefato **VidaBrasil-APK** (contém `vida-brasil-v1.0.0-debug.apk`).
3. Copie para o celular, toque no arquivo e permita "instalar apps de fontes desconhecidas".
4. Pronto: **Vida Brasil** instalado, com ícone próprio e 100% offline. 🎉

> O `debug.apk` é assinado automaticamente e serve para usar/distribuir entre amigos.
> Para publicar na Play Store, use o `release-assinavel.apk` e assine com sua keystore:
> `apksigner sign --ks sua-chave.keystore --out vida-brasil.apk app-release-unsigned.apk`

## ⚡ Ativar o build automático do APK (1 minuto, só 1 vez)

O pipeline completo já está pronto em **`ci/build-apk.yml`** — falta apenas o GitHub
enxergá-lo em `.github/workflows/`. Escolha UMA das opções:

**Opção A — pela web (sem terminal):**
1. Abra `ci/build-apk.yml` aqui no GitHub, clique em ✏️ (editar), selecione todo o conteúdo e copie (Ctrl+C).
2. Neste repositório, clique em **Add file → Create new file**, digite o nome
   `.github/workflows/build-apk.yml`, cole o conteúdo e faça **Commit**.
3. O build do APK dispara sozinho. Depois é só pegar o APK em **Actions → Artifacts**.

**Opção B — terminal (quem clonou o repo):**
```bash
mkdir -p .github/workflows && cp ci/build-apk.yml .github/workflows/build-apk.yml
git add .github && git commit -m "CI: ativa build do APK" && git push
```

> Se você é o dono do repositório e usa um app/integração para enviar código,
> a opção A é o caminho mais rápido (a integração pode não ter permissão de
> `workflows`, mas a interface web do GitHub, sim).


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
├── ci/build-apk.yml      # pipeline do APK → mova para .github/workflows/ (ver README)
├── config.xml            # config do Cordova (id, nome, ícones)
```

## 🧪 Stack

- **Jogo**: HTML5 + CSS3 + JavaScript vanilla (zero dependências em runtime)
- **Empacotamento**: Apache Cordova (WebView do sistema)
- **CI**: GitHub Actions → APK a cada push na `main`

## 📄 Licença

MIT — jogue, modifique e compartilhe. 🇧🇷
