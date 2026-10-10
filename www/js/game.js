'use strict';
/* ============================================================
   🚗 Vida Brasil — núcleo do jogo
   Vida cotidiana, trânsito e finanças brasileiras num só app.
   ============================================================ */

/* ---------------- utilidades ---------------- */
const $  = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const r2    = n => Math.round(n * 100) / 100;
const rnd   = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const rndf  = (a, b) => Math.random() * (b - a) + a;
const pick  = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt   = n => 'R$ ' + Number(n).toFixed(2).replace('.', ',');
const fmtKm = n => Number(n).toFixed(1).replace('.', ',');
const hojeStr = () => new Date().toISOString().slice(0, 10);

/* ---------------- dados: combustíveis & cidades ---------------- */
const GAS_BASE = { GASOLINA: 6.17, ALCOOL: 4.49, DIESEL: 6.27, GNV: 4.99 };
const COMBUSTIVEIS = {
  GASOLINA: { nome: 'Gasolina', icone: '⛽' },
  ALCOOL:   { nome: 'Álcool',   icone: '🌽' },
  DIESEL:   { nome: 'Diesel',   icone: '🛢️' },
  GNV:      { nome: 'GNV',      icone: '🔥' }
};
const CIDADES = [
  { nome: 'São Paulo 🏙️',  preco: 6.19 },
  { nome: 'Rio de Janeiro 🏖️', preco: 6.05 },
  { nome: 'Brasília 🏛️',   preco: 5.94 },
  { nome: 'Salvador 🌴',    preco: 6.21 },
  { nome: 'Curitiba 🌲',    preco: 6.02 },
  { nome: 'Manaus 🌳',      preco: 6.35 }
];

/* ---------------- dados: rotas ---------------- */
const ROTAS = [
  { id: 'padaria',  ico: '🥖', nome: 'Corrida da Padaria',      km: 2.5,  eventos: 3,  chanceE: .10, desc: 'Volta rápida no bairro' },
  { id: 'mercado',  ico: '🛒', nome: 'Ida ao Mercado',          km: 4.5,  eventos: 4,  chanceE: .12, desc: 'Compras da semana' },
  { id: 'escola',   ico: '🚸', nome: 'Levar as crianças à escola', km: 9, eventos: 5, chanceE: .12, desc: 'Rotina da manhã' },
  { id: 'trabalho', ico: '💼', nome: 'Trabalho (ida e volta)',  km: 16,   eventos: 6,  chanceE: .16, desc: 'O caminho de todo dia' },
  { id: 'serra',    ico: '⛰️', nome: 'Passeio na Serra',        km: 42,   eventos: 9,  chanceE: .22, desc: 'Curvas, lindreza e cuidado' },
  { id: 'estrada',  ico: '🚛', nome: 'Viagem interestadual',    km: 120,  eventos: 14, chanceE: .25, desc: 'Rodovia longa, bolso pesado' }
];

/* ---------------- dados: eventos de rota ---------------- */
const EVENTOS = [
  () => ({ ruim: true,  txt: '🔩 Um buraco se escondeu na sombra: furo no pneu!',                        delta: -rnd(18, 70) }),
  () => ({ ruim: true,  txt: '🚧 Pedágio no caminho.',                                                    delta: -rnd(4, 16) }),
  () => ({ ruim: true,  txt: '🍔 Parada estratégica para um lanche.',                                     delta: -rnd(6, 22) }),
  () => ({ ruim: true,  txt: '🅿️ Estacionamento rotativo na zona azul.',                                  delta: -rnd(5, 20) }),
  () => ({ ruim: true,  txt: '🚨 O radar flagrou um excesso leve de velocidade. Multa à vista!',          delta: -rnd(95, 195) }),
  () => ({ ruim: true,  txt: '🔧 Barulho estranho no motor… revisão leve na oficina.',                    delta: -rnd(30, 120) }),
  () => ({ ruim: true,  txt: '🌧️ Chuva forte = pistão escorregando: consumo extra!',                     delta: -rnd(3, 12) }),
  () => ({ ruim: false, txt: '🍀 Dia de sorte: cashback do cartão caiu!',                                 delta:  rnd(10, 40) }),
  () => ({ ruim: false, txt: '🙌 Um amigo rachou o combustível com você.',                                delta:  rnd(8, 25) }),
  () => ({ ruim: false, txt: '💰 Você achou uma nota na calçada e ninguém apareceu!',                     delta:  rnd(5, 25) }),
  () => ({ ruim: false, txt: '⛽ Promoc-relâmpago no posto: desconto surpresa!',                          delta:  rnd(6, 18) })
];

/* ---------------- dados: quiz de trânsito ---------------- */
const PERGUNTAS = [
  { q: 'Qual é o telefone do SAMU para emergências médicas?',
    a: ['190', '192', '193', '199'], c: 1,
    e: 'O SAMU atende emergências médicas em todo o Brasil pelo 192, de qualquer telefone, 24 horas por dia e de graça.' },
  { q: 'Você se aproxima de uma faixa de pedestres com pessoas esperando. O que fazer?',
    a: ['Buzinar para apressar', 'Reduzir e parar para dar passagem', 'Acelerar, ainda dá tempo', 'Mudar de faixa e seguir'], c: 1,
    e: 'Pelo CTB (art. 214), o motorista deve reduzir a velocidade e parar para permitir a passagem de pedestres na faixa.' },
  { q: 'No motor flex, o álcool compensa quando custa até quanto em relação à gasolina?',
    a: ['O mesmo preço', '70% do preço da gasolina', '50% do preço da gasolina', 'Nunca compensa'], c: 1,
    e: 'O álcool rende cerca de 70% da gasolina. Regra prática: só vale a pena se custar menos de 70% do preço da gasolina.' },
  { q: 'O que é o CRLV?',
    a: ['A carteira de habilitação', 'O documento que licencia o veículo', 'O seguro obrigatório', 'A nota fiscal do carro'], c: 1,
    e: 'O CRLV (Certificado de Registro e Licenciamento de Veículo) comprova que o carro está licenciado e pode circular.' },
  { q: 'Em rodovias, os faróis baixos devem estar acesos:',
    a: ['Só à noite', 'Só com neblina', 'Dia e noite', 'Nunca é obrigatório'], c: 2,
    e: 'Desde 2019, circular com faróis baixos acesos em rodovias é obrigatório também durante o dia — melhora muito a visibilidade.' },
  { q: 'Para denunciar violência contra a mulher, qual telefone liga a Central de Atendimento?',
    a: ['180', '190', '100', '156'], c: 0,
    e: 'O 180 é a Central de Atendimento à Mulher — gratuito, sigiloso e funciona 24h.' },
  { q: 'Manter os pneus calibrados ajuda a:',
    a: ['Gastar mais combustível', 'Reduzir consumo e evitar acidentes', 'Só na estética do carro', 'Nada, é frescura'], c: 1,
    e: 'Pneu murcho aumenta o consumo, desgasta o pneu e piora a frenagem. Calibre a cada 15 dias!' },
  { q: 'O carro “aquaplanou” numa poça. Você deve:',
    a: ['Frear forte na hora', 'Acelerar para passar rápido', 'Tirar o pé do acelerador e segurar o volante firme', 'Puxar o freio de mão'], c: 2,
    e: 'Na hidroplanagem, reduza o acelerador devagar e mantenha a direção reta. Frear bruscamente faz o carro derrapar.' },
  { q: 'Em descidas longas, o correto é:',
    a: ['Descer em ponto morto para economizar', 'Usar marcha reduzida (freio motor)', 'Pisar no freio o tempo todo', 'Desligar o carro'], c: 1,
    e: 'O freio motor controla a velocidade sem superaquecer os freios. Descer em ponto morto é perigoso e não economiza.' },
  { q: 'Quando um agente de trânsito está controlando o fluxo com gestos, o que prevalece?',
    a: ['Os semáforos', 'As placas', 'Os gestos do agente', 'A buzina'], c: 2,
    e: 'Pelo CTB, as ordens do agente de trânsito prevalecem sobre sinais, semáforos e regras gerais.' },
  { q: 'Acidente leve sem vítimas numa via urbana movimentada. O que fazer?',
    a: ['Esperar a viatura no meio da pista', 'Remover os carros da pista e registrar boletim', 'Fugir, foi só um ralinho', 'Discutir quem pagou a culpa'], c: 1,
    e: 'Sem vítimas, os veículos devem ser removidos para não provocar congestionamento. O boletim pode ser feito depois.' },
  { q: 'O cinto de segurança é obrigatório para:',
    a: ['Só o motorista', 'Só quem vai na frente', 'Todos os ocupantes', 'Só em rodovia'], c: 2,
    e: 'Todos os ocupantes, em qualquer via. E criança deve ir na cadeirinha adequada ao peso e à idade.' }
];

/* ---------------- dados: quiz do SAMU (192) ---------------- */
const QUIZ192 = [
  { q: 'Quando devo acionar o SAMU (192)?', a: ['Para pedir carona', 'Emergências médicas com risco de vida', 'Para reclamar do vizinho', 'Só em acidente de trabalho'], c: 1,
    e: 'O SAMU é para emergências médicas: dificuldade para respirar, suspeita de infarto, acidentes com vítimas, entre outros.' },
  { q: 'Ao ligar para o 192, o que informar PRIMEIRO?', a: ['Seu time de coração', 'O local exato do ocorrido', 'A marca do seu carro', 'O que você jantou'], c: 1,
    e: 'Local exato é a informação mais importante — sem ele a ambulância não chega. Depois, o que aconteceu e o estado da vítima.' },
  { q: 'Enquanto a ambulância não chega, você deve:', a: ['Dar água e remédio à vítima', 'Mexer na vítima para “ajeitar”', 'Manter a vítima calma e não movimentá-la se houver suspeita de fratura', 'Aguardar dentro de casa'], c: 2,
    e: 'Movimentar uma vítima com suspeita de fratura na coluna pode agravar tudo. Mantenha-a calma, aquecida e imóvel — salvo se houver perigo iminente.' },
  { q: 'O 192 funciona:', a: ['Só de madrugada', 'Só em celular', '24h, grátis, de qualquer telefone', 'Só em dias úteis'], c: 2,
    e: 'O SAMU opera 24 horas por dia, todos os dias, gratuitamente, de qualquer telefone — fixo ou celular.' }
];

/* ---------------- dados: missões semanais ---------------- */
const DESAFIOS = [
  { id: 'viagens',  ico: '🛣️', nome: 'Rodando livre',        desc: 'Complete 4 viagens',                 meta: 4,   get: s => s.w.viagens },
  { id: 'km',       ico: '📏', nome: 'Maratonista do asfalto', desc: 'Percorra 60 km na semana',          meta: 60,  get: s => s.w.km },
  { id: 'quiz',     ico: '📝', nome: 'Estudante nota 10',     desc: 'Acerte 6 perguntas no quiz',         meta: 6,   get: s => s.w.quiz },
  { id: 'abast',    ico: '⛽', nome: 'Bomba cheia',           desc: 'Abasteça 2 vezes',                   meta: 2,   get: s => s.w.abast },
  { id: 'poupanca', ico: '💰', nome: 'Guardião do trocado',   desc: 'Tenha R$ 120 no bolso',              meta: 120, get: s => s.dinheiro },
  { id: 'semSustos',ico: '😌', nome: 'Dirigida preventiva',   desc: 'Faça uma viagem de 10+ km sem imprevistos', meta: 1, get: s => s.w.semSustos }
];

/* ---------------- dados: conquistas ---------------- */
const CONQUISTAS = [
  { id: 'primeiro', ico: '🥇', nome: 'Primeiro volante',  desc: 'Complete sua primeira viagem',        check: s => s.stats.viagens >= 1 },
  { id: 'quiz10',   ico: '📝', nome: 'Doutor Trânsito',   desc: 'Acerte 10 perguntas',                 check: s => s.stats.quizCertas >= 10 },
  { id: 'rico',     ico: '💰', nome: 'Cofrinho cheio',    desc: 'Junte R$ 150',                        check: s => s.dinheiro >= 150 },
  { id: 'nvl5',     ico: '⭐', nome: 'Nível 5',           desc: 'Chegue ao nível 5',                   check: s => s.nivel >= 5 },
  { id: 'nvl10',    ico: '🌟', nome: 'Nível 10',          desc: 'Chegue ao nível 10',                  check: s => s.nivel >= 10 },
  { id: 'semanal',  ico: '📅', nome: 'Semana perfeita',   desc: 'Complete todas as missões de 1 semana', check: s => s.semanasPerfeitas >= 1 },
  { id: 'heroi',    ico: '🚑', nome: 'Herói do 192',      desc: 'Acerte todo o quiz do SAMU',          check: s => !!s.flags.samui },
  { id: 'gamer',    ico: '🎮', nome: 'SinalVida 50',      desc: 'Sobreviva a 50 fileiras no SinalVida', check: s => s.stats.mgBest >= 50 },
  { id: 'eco',      ico: '🌱', nome: 'Mente ecológica',   desc: 'Economize R$ 40/mês na troca de carro', check: s => !!s.flags.trocaEco },
  { id: 'cesta',    ico: '🧺', nome: 'Cesta básica',      desc: 'Complete o mercado numa semana',      check: s => !!s.flags.cestaSem },
  { id: 'gnv',      ico: '🔥', nome: 'Gás vida',          desc: 'Complete uma viagem usando GNV',      check: s => !!s.flags.viagemGnv },
  { id: 'serra',    ico: '⛰️', nome: 'Alpinista',         desc: 'Faça o passeio na Serra',             check: s => (s.rotasFeitas.serra || 0) >= 1 }
];

/* ---------------- estado ---------------- */
const SAVE_KEY = 'vidabrasil.save.v1';
let S = null;

function estadoNovo(nome, avatar) {
  const cidade = pick(CIDADES);
  return {
    nome, avatar, cidade: cidade.nome,
    gasBase: cidade.preco, gasMod: rndf(0.97, 1.03), dia: hojeStr(),
    dinheiro: 32.4, nivel: 1, xp: 0,
    tanque: 50, comb: 22, consumo: 10.5,
    combustivel: 'GASOLINA',
    pantry: {},                // id -> quantidade
    w: { viagens: 0, km: 0, quiz: 0, abast: 0, semSustos: 0 },
    semana: 1, semanasPerfeitas: 0,
    flags: {},                 // badges programáticos
    rotasFeitas: {},
    stats: { viagens: 0, km: 0, quizCertas: 0, quizJogadas: 0, abast: 0, mgBest: 0 },
    conq: {}                   // id -> true
  };
}

function carregar() {
  try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; }
  catch (e) { return null; }
}
function salvar() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }

/* ---------------- áudio (WebAudio, sem arquivos) ---------------- */
let AC = null;
function som(tipo) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const seqs = {
      click: [[620, .05, .06]],
      ok:    [[660, .07, .1], [990, .1, .1]],
      err:   [[200, .18, .12, 'sawtooth']],
      coin:  [[880, .06, .1], [1318, .12, .1]],
      level: [[523, .08, .11], [659, .08, .11], [784, .08, .11], [1047, .2, .13]],
      crash: [[110, .3, .18, 'sawtooth']]
    };
    const t = AC.currentTime; let off = 0;
    for (const [f, d, v, type] of (seqs[tipo] || [])) {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type || 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(v, t + off);
      g.gain.exponentialRampToValueAtTime(.001, t + off + d);
      o.connect(g); g.connect(AC.destination);
      o.start(t + off); o.stop(t + off + d);
      off += d * .9;
    }
  } catch (e) {}
}

/* ---------------- toasts & confete ---------------- */
function toast(msg, ouro) {
  const t = document.createElement('div');
  t.className = 'toast' + (ouro ? ' ouro' : '');
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; }, 2600);
  setTimeout(() => t.remove(), 3100);
}
function confete() {
  const cv = $('#confetti'), ctx = cv.getContext('2d');
  cv.width = innerWidth; cv.height = innerHeight;
  const cores = ['#00c853', '#ffd600', '#40a2ff', '#ff5262', '#b388ff'];
  const ps = Array.from({ length: 90 }, () => ({
    x: rnd(0, cv.width), y: rnd(-cv.height * .5, -10),
    vy: rndf(90, 260), vx: rndf(-40, 40), s: rnd(5, 10),
    c: pick(cores), a: rndf(0, 6), va: rndf(-6, 6)
  }));
  const t0 = performance.now();
  (function passo(t) {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const p of ps) {
      p.y += p.vy * .016; p.x += p.vx * .016; p.a += p.va * .016;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); ctx.restore();
    }
    if (t - t0 < 2600) requestAnimationFrame(passo);
    else ctx.clearRect(0, 0, cv.width, cv.height);
  })(t0);
}

/* ---------------- modal ---------------- */
function modal(titulo, html, botoes) {
  $('#modal-titulo').textContent = titulo;
  $('#modal-corpo').innerHTML = html || '';
  const wrap = $('#modal-botoes'); wrap.innerHTML = '';
  for (const b of (botoes || [{ txt: 'OK', cls: 'btn-primario' }])) {
    const btn = document.createElement('button');
    btn.className = 'btn ' + (b.cls || '');
    btn.textContent = b.txt;
    btn.onclick = () => { som('click'); fecharModal(); if (b.fn) b.fn(); };
    wrap.appendChild(btn);
  }
  $('#modal-wrap').classList.remove('oculto');
}
function fecharModal() { $('#modal-wrap').classList.add('oculto'); mgPausa(false); }

/* ---------------- progressão ---------------- */
const xpNecessario = n => 60 + (n - 1) * 35;

function ganhaXp(qtd, silencioso) {
  S.xp += Math.round(qtd);
  let subiu = false;
  while (S.xp >= xpNecessario(S.nivel)) {
    S.xp -= xpNecessario(S.nivel);
    S.nivel++; subiu = true;
    const bonus = 10 + S.nivel * 5;
    S.dinheiro = r2(S.dinheiro + bonus);
    if (!silencioso) {
      toast('🎉 Nível ' + S.nivel + '! +' + fmt(bonus), true);
      som('level'); confete();
    }
  }
  if (subiu) checarConquistas();
  salvar();
}

function checarConquistas() {
  for (const c of CONQUISTAS) {
    if (!S.conq[c.id] && c.check(S)) {
      S.conq[c.id] = true;
      toast('🏆 Conquista: ' + c.nome + '!', true);
      som('coin'); confete();
    }
  }
  salvar();
}

/* ---------------- preços ---------------- */
function preco(tipo) {
  const p = GAS_BASE[tipo] !== undefined ? GAS_BASE[tipo] * S.gasMod : null;
  return r2(p);
}
function precos() {
  return { GASOLINA: preco('GASOLINA'), ALCOOL: preco('ALCOOL'), DIESEL: preco('DIESEL'), GNV: preco('GNV') };
}
/* rendimento relativo por tipo de combustível */
function fatorComb(tipo) {
  return { GASOLINA: 1, ALCOOL: .7, DIESEL: 1.05, GNV: 1 }[tipo] || 1;
}
function autonomia() {
  return Math.floor(S.comb * S.consumo * fatorComb(S.combustivel));
}

/* ============================================================
   NAVEGAÇÃO
   ============================================================ */
let telaAtual = 'home';
function mostraTela(id) {
  telaAtual = id;
  $$('.tela').forEach(t => t.classList.remove('ativa'));
  $('#tela-' + id).classList.add('ativa');
  $$('.tab').forEach(t => t.classList.toggle('ativa', t.dataset.tela === id));
  $('#conteudo').scrollTop = 0;
  if (id !== 'mais') mgPausa(true);
  renderTela(id);
  som('click');
}

function renderTela(id) {
  if (id === 'home') renderHome();
  else if (id === 'jogar') renderJogar();
  else if (id === 'posto') renderPosto();
  else if (id === 'mercado') renderMercado();
  else if (id === 'quiz') renderQuiz();
  else if (id === 'mais') renderMais();
}

function renderTudo() {
  renderTopo(); renderTela(telaAtual);
}

function renderTopo() {
  $('#chip-dinheiro').textContent = '💰 ' + fmt(S.dinheiro);
  $('#chip-nivel').textContent = '⭐ Nv ' + S.nivel;
  const pct = Math.round(S.comb / S.tanque * 100);
  const chipC = $('#chip-comb');
  chipC.textContent = '⛽ ' + pct + '%';
  chipC.classList.toggle('baixo', pct < 20);
  $('#xpfill').style.width = clamp(S.xp / xpNecessario(S.nivel) * 100, 0, 100) + '%';
  $('#xptxt').textContent = S.xp + '/' + xpNecessario(S.nivel) + ' XP';
}

/* ============================================================
   TELA: HOME
   ============================================================ */
function renderHome() {
  const pct = Math.round(S.comb / S.tanque * 100);
  const nConq = Object.keys(S.conq).length;
  const cesta = Object.keys(S.pantry).length;
  $('#tela-home').innerHTML = `
    <div class="card">
      <h2>Olá, ${S.nome}! <small>${S.avatar} • ${S.cidade}</small></h2>
      <p class="desc">Gasolina hoje: <b style="color:var(--amarelo)">${fmt(precos().GASOLINA)}/L</b> • Seu carro faz <b>${fmtKm(S.consumo)} km/L</b>.</p>
      <div class="grade3">
        <div class="stat"><div class="v">${fmt(S.dinheiro)}</div><div class="k">na carteira</div></div>
        <div class="stat"><div class="v">${pct}%</div><div class="k">combustível</div></div>
        <div class="stat"><div class="v">${S.semana}ª</div><div class="k">semana</div></div>
      </div>
      <div class="gauge"><div class="fill" style="width:${pct}%"></div><div class="gtxt">Tanque: ${fmtKm(S.comb)}/${S.tanque} L</div></div>
      ${pct < 20 ? '<p class="desc" style="color:var(--verm);margin:6px 0 0">⚠️ Combustível baixo! Visite o posto antes de viajar.</p>' : ''}
      <div class="btn-linha">
        <button class="btn btn-primario" onclick="app.mostraTela('jogar')">🚗 Dirigir</button>
        <button class="btn btn-amarelo" onclick="app.mostraTela('posto')">⛽ Abastecer</button>
        <button class="btn btn-azul" onclick="app.mostraTela('quiz')">📝 Quiz</button>
      </div>
    </div>

    <div class="card">
      <h2>🗓️ Missões da semana <small>${S.semana}</small></h2>
      <p class="desc">Complete todas e ganhe <b style="color:var(--amarelo)">+$60</b> na virada.</p>
      ${DESAFIOS.slice(0, 3).map(d => linhaMissao(d)).join('')}
      <button class="btn" style="width:100%;margin-top:4px" onclick="app.mostraTela('mais')">Ver todas as missões</button>
    </div>

    <div class="card">
      <h2>🏆 Conquistas <small>${nConq}/${CONQUISTAS.length}</small></h2>
      <div class="conq-grid">
        ${CONQUISTAS.map(c => `
          <div class="conq ${S.conq[c.id] ? 'ganha' : ''}" title="${c.desc}">
            <div class="cico">${c.ico}</div><div class="cnome">${c.nome}</div>
          </div>`).join('')}
      </div>
    </div>`;
}
function linhaMissao(d) {
  const v = clamp(d.get(S), 0, d.meta);
  const feita = v >= d.meta;
  return `
    <div class="missao ${feita ? 'feita' : ''}">
      <div class="mtopo">${d.ico} ${d.nome}</div>
      <div class="mdesc">${d.desc} — ${Number.isInteger(v) && d.meta > 20 && d.id === 'poupanca' ? fmt(v) : v + '/' + d.meta}</div>
      <div class="mbar"><div class="mfill" style="width:${v / d.meta * 100}%"></div></div>
    </div>`;
}

/* ============================================================
   TELA: DIRIGIR
   ============================================================ */
function renderJogar() {
  const pct = Math.round(S.comb / S.tanque * 100);
  $('#tela-jogar').innerHTML = `
    <div class="card">
      <h2>🗺️ Para onde vamos? <small>${S.avatar} ${S.nome}</small></h2>
      <div class="gauge"><div class="fill" style="width:${pct}%"></div><div class="gtxt">Autonomia ≈ ${autonomia()} km</div></div>
      <p class="desc">Cada viagem gasta combustível (${fmtKm(S.consumo)} km/L${S.combustivel === 'ALCOOL' ? ' × 0,7 do álcool' : ''}), pode trazer imprevistos — e rende XP!</p>
    </div>
    ${ROTAS.map(r => {
      const litros = r2(r.km / (S.consumo * fatorComb(S.combustivel)));
      const ok = litros <= S.comb;
      return `
        <button class="rota" onclick="app.dirigir('${r.id}')" ${ok ? '' : 'style="opacity:.55"'}>
          <span class="rico">${r.ico}</span>
          <span>
            <div class="rnome">${r.nome}</div>
            <div class="rmeta">${fmtKm(r.km)} km • ≈${fmtKm(litros)} L • +XP • ${r.desc}</div>
          </span>
          <span class="rdir">${ok ? '▶' : '⛔'}</span>
        </button>`;
    }).join('')}
    <div class="card">
      <h2>📓 Diário de bordo</h2>
      <div class="log" id="log-viagem">Suas aventuras aparecem aqui…</div>
    </div>`;
}

function dirigir(id) {
  const rota = ROTAS.find(r => r.id === id);
  const litros = r2(rota.km / (S.consumo * fatorComb(S.combustivel)));
  if (S.comb < 0.8) {
    modal('⛽ Tanque seco!', 'Seu carro não anda nem até a esquina. Que tal abastecer?',
      [{ txt: 'Ir ao posto 🚏', cls: 'btn-primario', fn: () => mostraTela('posto') }, { txt: 'Depois' }]);
    return;
  }
  if (litros > S.comb) {
    modal('⛽ Combustível insuficiente', `A viagem de <b>${fmtKm(rota.km)} km</b> precisa de <b>${fmtKm(litros)} L</b> e você tem <b>${fmtKm(S.comb)} L</b>.<br><br>Abasteça antes de partir!`,
      [{ txt: 'Ir ao posto 🚏', cls: 'btn-primario', fn: () => mostraTela('posto') }, { txt: 'Cancelar' }]);
    return;
  }

  const gastoBase = r2(litros * preco(S.combustivel));
  S.comb = r2(S.comb - litros);
  if (S.combustivel === 'GNV') S.flags.viagemGnv = true;

  const linhas = [`🚗 ${rota.nome} — ${fmtKm(rota.km)} km`];
  linhas.push(`⛽ Queimou ${fmtKm(litros)} L (${fmt(gastoBase)} em combustível)`);

  let ruins = 0, delta = 0;
  for (let i = 0; i < rota.eventos; i++) {
    if (Math.random() < rota.chanceE) {
      const ev = pick(EVENTOS)();
      S.dinheiro = r2(S.dinheiro + ev.delta);
      delta += ev.delta;
      if (ev.ruim) ruins++;
      linhas.push(ev.txt + ' ' + (ev.delta >= 0 ? '<span class="ok">+' : '<span class="ruim">') + fmt(ev.delta).replace('R$ ', 'R$') + '</span>');
      som(ev.delta >= 0 ? 'coin' : 'err');
    }
  }
  if (ruins === 0) linhas.push('<span class="ok">✅ Viagem tranquila, sem imprevistos!</span>');
  if (rota.km >= 10 && ruins === 0) S.w.semSustos = 1;

  const ganho = Math.max(3, Math.round(rota.km * .8) + (ruins ? -2 : 2));
  S.rotasFeitas[rota.id] = (S.rotasFeitas[rota.id] || 0) + 1;
  S.stats.viagens++; S.stats.km = r2(S.stats.km + rota.km);
  S.w.viagens++; S.w.km = r2(S.w.km + rota.km);
  ganhaXp(ganho, true);
  linhas.push(`<span class="info">✨ +${ganho} XP</span> • carteira: <span class="grana">${fmt(S.dinheiro)}</span>` + (delta !== 0 ? ` (${delta >= 0 ? '+' : '−'}${fmt(Math.abs(delta)).slice(3)} fora do combustível)` : ''));

  salvar(); checarConquistas();
  renderTudo();

  const logEl = $('#log-viagem');
  if (logEl) logEl.innerHTML = linhas.join('<br>');
  toast('🏁 Viagem concluída! +' + ganho + ' XP');
  if (rota.id === 'serra') confete();
}

/* ============================================================
   TELA: POSTO
   ============================================================ */
function renderPosto() {
  const P = precos();
  const pct = Math.round(S.comb / S.tanque * 100);
  $('#tela-posto').innerHTML = `
    <div class="card">
      <h2>🚏 Posto Vida Brasil <small>${S.cidade}</small></h2>
      <div class="gauge"><div class="fill" style="width:${pct}%"></div><div class="gtxt">Tanque: ${fmtKm(S.comb)}/${S.tanque} L</div></div>
      <p class="desc">Escolha o combustível do seu carro:</p>
      <div class="comb-grid">
        ${Object.keys(COMBUSTIVEIS).map(k => {
          const range = Math.floor(S.comb * S.consumo * fatorComb(k));
          return `
            <div class="comb-op ${S.combustivel === k ? 'sel' : ''}" onclick="app.escolherComb('${k}')">
              <div class="cico">${COMBUSTIVEIS[k].icone}</div>
              <div class="cnome">${COMBUSTIVEIS[k].nome}</div>
              <div class="cpreco">${fmt(P[k])}${k === 'GNV' ? '/m³' : '/L'}</div>
              <div class="crange">autonomia ≈ ${range} km</div>
            </div>`;
        }).join('')}
      </div>
      <div class="btn-linha">
        <button class="btn btn-primario" onclick="app.abastecer()">✅ Abastecer tanque cheio</button>
      </div>
      ${S.combustivel === 'ALCOOL' ? '<p class="desc" style="margin-top:8px">🌽 Com álcool o rendimento cai ~30% — vale quando custar menos de 70% do preço da gasolina.</p>' : ''}
      <div class="log" id="log-posto" style="margin-top:10px">Bomba pronta, chefe!</div>
    </div>

    <div class="card">
      <h2>🧠 Dica do frentista</h2>
      <p class="desc" id="dica-posto">${dicaFrentista()}</p>
      <button class="btn" style="width:100%" onclick="app.novaDica()">🔄 Outra dica</button>
    </div>`;
}

const DICAS = [
  'Calibre os pneus a cada 15 dias: até 10% de economia no consumo.',
  'Acelerar de leve faz o tanque render muito mais do que arrancadas de fuleragem.',
  'Peso desnecessário no porta-malas vira dinheiro queimado no escapamento.',
  'Na estrada, manter 80–100 km/h constantes é o ponto feliz do consumo.',
  'Ar-condicionado na cidade gasta mais; janelas na estrada também. Use com juízo!',
  'Revisão em dia custa menos que guincho no meio da madrugada.',
  'Álcool compensa quando custa até 70% do preço da gasolina. Faça as contas!',
  'GNV tem o km mais barato, mas a conversão tem custo inicial — jogue com calma.',
  'Faixa de pedestres é lei, não sugestão. E no quiz vale ponto! 😉'
];
function dicaFrentista() { return pick(DICAS); }
function novaDica() { $('#dica-posto').textContent = dicaFrentista(); som('click'); }

function escolherComb(tipo) {
  S.combustivel = tipo;
  salvar(); renderPosto(); renderTopo(); som('click');
}

function abastecer() {
  const falta = r2(S.tanque - S.comb);
  if (falta <= 0.2) { toast('💡 O tanque já está cheio!'); som('click'); return; }
  const p = preco(S.combustivel);
  const custoTotal = r2(falta * p);
  const custo = r2(Math.min(custoTotal, S.dinheiro));
  if (custo < 1) {
    modal('💸 Sem dinheiro no bolso', `O tanque cheio custaria <b>${fmt(custoTotal)}</b>, mas você tem só <b>${fmt(S.dinheiro)}</b>.<br><br>Faça uma viagem, jogue o quiz ou espere o salário do próximo nível!`,
      [{ txt: 'Entendi 😢' }]);
    return;
  }
  const litros = r2(custo / p);
  S.dinheiro = r2(S.dinheiro - custo);
  S.comb = r2(Math.min(S.tanque, S.comb + litros));
  S.w.abast++; S.stats.abast++;
  ganhaXp(4, true);
  checarConquistas();
  salvar(); renderTudo();
  const parcial = custo < custoTotal;
  const log = `⛽ Abastecidos ${fmtKm(litros)} ${S.combustivel === 'GNV' ? 'm³' : 'L'} de ${COMBUSTIVEIS[S.combustivel].nome} por <b>${fmt(custo)}</b>` +
    (parcial ? ` <span class="ruim">(deu pra metade da conta — dinheiro curto!)</span>` : ' <span class="ok">(tanque cheio! 🎉)</span>');
  const el = $('#log-posto'); if (el) el.innerHTML = log;
  toast('⛽ +' + fmtKm(litros) + ' L no tanque!');
  som('coin');
}

/* ============================================================
   TELA: MERCADO
   ============================================================ */
const MERCADO = [
  { id: 'arroz',  n: '🍚 Arroz 5 kg',        p: 24.9 },
  { id: 'feijao', n: '🫘 Feijão 1 kg',       p: 8.49 },
  { id: 'cafe',   n: '☕ Café 500 g',        p: 18.9 },
  { id: 'oleo',   n: '🛢️ Óleo de soja',      p: 7.29 },
  { id: 'leite',  n: '🥛 Leite integral',    p: 5.49 },
  { id: 'pao',    n: '🍞 Pão francês (kg)',  p: 14.9 },
  { id: 'ovos',   n: '🥚 Ovos (dúzia)',      p: 12.9 },
  { id: 'carne',  n: '🥩 Carne (kg)',        p: 39.9 },
  { id: 'fruta',  n: '🍌 Frutas da estação', p: 9.9 },
  { id: 'limpeza',n: '🧼 Kit de limpeza',    p: 21.5 }
];

function renderMercado() {
  const total = r2(MERCADO.reduce((t, i) => t + i.p * (S.pantry[i.id] || 0), 0));
  const completa = MERCADO.every(i => (S.pantry[i.id] || 0) >= 1);
  $('#tela-mercado').innerHTML = `
    <div class="card">
      <h2>🛒 Mercado do Zé <small>${S.cidade}</small></h2>
      <p class="desc">Monte a cesta básica da semana. Complete tudo para ganhar bônus de XP e uma graninha extra!</p>
      ${MERCADO.map(i => {
        const q = S.pantry[i.id] || 0;
        return `
          <div class="item">
            <span class="inome">${i.n}</span>
            <span class="ipreco">${fmt(i.p)}</span>
            <span class="iqtd">×${q}</span>
            <button class="ibtn" onclick="app.comprar('${i.id}')" ${S.dinheiro >= i.p ? '' : 'disabled'}>+</button>
          </div>`;
      }).join('')}
      <div class="total-linha"><span>Carteira: ${fmt(S.dinheiro)}</span><span class="tt">Cesta: ${fmt(total)}</span></div>
      ${completa && !S.flags.cestaSem ? '<button class="btn btn-amarelo btn-grande" style="margin-top:12px" onclick="app.cestaCompleta()">🧺 Fechar a cesta da semana (+R$ 20 e +30 XP)</button>' : ''}
      ${S.flags.cestaSem ? '<p class="desc" style="color:var(--verde2);margin-top:8px">✅ Cesta da semana já garantida. Boa gestão, chefe!</p>' : ''}
    </div>`;
}

function comprar(id) {
  const item = MERCADO.find(i => i.id === id);
  if (S.dinheiro < item.p) { som('err'); return; }
  S.dinheiro = r2(S.dinheiro - item.p);
  S.pantry[id] = (S.pantry[id] || 0) + 1;
  ganhaXp(2, true);
  salvar(); renderMercado(); renderTopo();
  som('coin');
  if (MERCADO.every(i => (S.pantry[i.id] || 0) >= 1) && !S.flags.cestaSem) {
    toast('🧺 Cesta completa! Feche o pedido lá embaixo 👇', true);
  }
}

function cestaCompleta() {
  S.flags.cestaSem = true;
  S.dinheiro = r2(S.dinheiro + 20);
  ganhaXp(30);
  checarConquistas();
  salvar(); renderMercado(); renderTopo();
  modal('🧺 Cesta básica garantida!', `Você completou a cesta da semana ${S.semana}.<br><br><b style="color:var(--amarelo)">+R$ 20,00</b> de bônus e <b>+30 XP</b>!<br><br>A família agradece. 🥰`, [{ txt: 'Massa! 🎉', cls: 'btn-primario' }]);
}

/* ============================================================
   TELA: QUIZ
   ============================================================ */
let Q = null; // sessão de quiz corrente

function renderQuiz() {
  $('#tela-quiz').innerHTML = `
    <div class="qplacar">
      <div class="stat"><div class="v">${S.stats.quizCertas}</div><div class="k">acertos totais</div></div>
      <div class="stat"><div class="v">${S.stats.quizJogadas}</div><div class="k">quizzes feitos</div></div>
      <div class="stat"><div class="v">${Math.round(S.stats.quizJogadas ? S.stats.quizCertas / Math.max(1, S.stats.quizJogadas * 12) * 100 : 0)}%</div><div class="k">aproveitamento</div></div>
    </div>
    <div class="card" id="quiz-caixa"></div>
    <div class="card">
      <h2>🚑 Quiz do SAMU</h2>
      <p class="desc">4 perguntas especiais sobre o 192. Acerte todas e vire o <b>Herói do 192</b>! 🏆</p>
      <button class="btn btn-verm" style="width:100%" onclick="app.iniciarQuiz('q192')">❤️🩹 Fazer o quiz do SAMU</button>
    </div>
    <div class="card">
      <h2>☎️ Telefones de emergência do Brasil</h2>
      <p class="desc">Salve na vida real também — vale mais que qualquer XP:</p>
      <div class="tel-grid">
        <div class="tel pol"><div class="tnum">190</div><div class="tnome">Polícia Militar</div></div>
        <div class="tel sam"><div class="tnum">192</div><div class="tnome">SAMU (emergência médica)</div></div>
        <div class="tel bom"><div class="tnum">193</div><div class="tnome">Bombeiros</div></div>
        <div class="tel mul"><div class="tnum">180</div><div class="tnome">Proteção à Mulher</div></div>
        <div class="tel den"><div class="tnum">181</div><div class="tnome">Disque-Denúncia</div></div>
        <div class="tel def"><div class="tnum">199</div><div class="tnome">Defesa Civil</div></div>
      </div>
    </div>`;
  if (!Q) Q = novaSessao('transito');
  renderQuizAtual();
}

function novaSessao(tipo) {
  const base = tipo === 'q192' ? QUIZ192 : PERGUNTAS;
  const perguntas = base.slice().sort(() => Math.random() - .5);
  return { tipo, perguntas, i: 0, certas: 0, respondida: false, travada: false };
}

function renderQuizAtual() {
  const caixa = $('#quiz-caixa');
  if (!caixa) return;
  if (Q.i >= Q.perguntas.length) {
    const tipoTxt = Q.tipo === 'q192' ? 'quiz do SAMU' : 'quiz de trânsito';
    const perfeito = Q.certas === Q.perguntas.length;
    caixa.innerHTML = `
      <h2>${perfeito ? '🏆 Gabarito de mestre!' : '📊 Fim do ' + tipoTxt}</h2>
      <p class="desc">Você acertou <b>${Q.certas} de ${Q.perguntas.length}</b> perguntas.</p>
      <div class="btn-linha">
        <button class="btn btn-primario" onclick="app.iniciarQuiz('${Q.tipo}')">🔁 Jogar de novo</button>
        <button class="btn" onclick="app.iniciarQuiz('transito')">📝 Quiz completo</button>
      </div>`;
    return;
  }
  const p = Q.perguntas[Q.i];
  caixa.innerHTML = `
    <div class="qnome">PERGUNTA ${Q.i + 1}/${Q.perguntas.length} • ${Q.tipo === 'q192' ? '🚑 SAMU' : '📝 TRÂNSITO'}</div>
    <div class="qtexto">${p.q}</div>
    ${p.a.map((alt, idx) => `<button class="alt" id="alt-${idx}" onclick="app.responder(${idx})">${String.fromCharCode(65 + idx)}) ${alt}</button>`).join('')}
    <div id="quiz-feedback"></div>
    <div id="quiz-avancar"></div>`;
}

function responder(idx) {
  if (Q.travada) return;
  Q.travada = true;
  const p = Q.perguntas[Q.i];
  const acertou = idx === p.c;
  for (let i = 0; i < p.a.length; i++) {
    const el = $('#alt-' + i);
    if (el) { el.disabled = true; if (i === p.c) el.classList.add('correta'); }
  }
  if (!acertou) { const el = $('#alt-' + idx); if (el) el.classList.add('errada'); }
  if (acertou) {
    Q.certas++;
    S.stats.quizCertas++; S.w.quiz++;
    ganhaXp(10, true); S.dinheiro = r2(S.dinheiro + 4);
    som('ok');
  } else { som('err'); }
  $('#quiz-feedback').innerHTML = `
    <div class="explica">${acertou ? '✅ <b>Isso aí!</b> ' : '❌ <b>Quase!</b> '}${p.e} ${acertou ? '<br><b style="color:var(--verde2)">+10 XP • +R$ 4</b>' : ''}</div>`;
  $('#quiz-avancar').innerHTML = `<button class="btn btn-primario btn-grande" style="margin-top:10px" onclick="app.proxima()">${Q.i + 1 >= Q.perguntas.length ? 'Ver resultado 🏁' : 'Próxima pergunta ▶'}</button>`;
  salvar(); renderTopo();
}

function proxima() {
  som('click');
  Q.i++; Q.travada = false;
  if (Q.i >= Q.perguntas.length) {
    S.stats.quizJogadas++;
    const perfeito = Q.certas === Q.perguntas.length;
    if (Q.tipo === 'q192' && perfeito) { S.flags.samui = true; checarConquistas(); }
    ganhaXp(Q.certas * 4);
    checarConquistas();
    salvar(); renderTopo();
    toast('📝 Quiz encerrado: ' + Q.certas + '/' + Q.perguntas.length);
  }
  renderQuizAtual();
}

function iniciarQuiz(tipo) { Q = novaSessao(tipo); renderQuiz(); som('click'); }

/* ============================================================
   TELA: MAIS (missões, minigame, troca, config)
   ============================================================ */
function renderMais() {
  const todasFeitas = DESAFIOS.every(d => clamp(d.get(S), 0, d.meta) >= d.meta);
  $('#tela-mais').innerHTML = `
    <div class="card">
      <h2>🗓️ Missões da semana ${S.semana}</h2>
      <p class="desc">Complete todas para liberar a virada de semana: <b style="color:var(--amarelo)">+$60 e +50 XP</b>.</p>
      ${DESAFIOS.map(d => linhaMissao(d)).join('')}
      <button class="btn btn-roxo btn-grande" style="margin-top:8px" onclick="app.viradaSemana()" ${todasFeitas ? '' : 'disabled'}>
        ${todasFeitas ? '🌙 Virar a semana (coletar bônus!)' : 'Complete as missões para virar a semana'}
      </button>
    </div>

    <div class="card">
      <h2>🎮 SinalVida — o minigame</h2>
      <p class="desc">Desvie do trânsito caótico! Sobreviva a 50 fileiras e leve a conquista <b>SinalVida 50</b>.</p>
      <div class="mg-hud"><span>🏆 Recorde: <b id="mg-best">${S.stats.mgBest}</b></span><span id="mg-score">Fileiras: 0</span></div>
      <canvas id="mg-canvas" width="300" height="430"></canvas>
      <div class="mg-ctrl">
        <button class="btn" onclick="app.mgMove(-1)">◀</button>
        <button class="btn btn-primario" id="mg-start" onclick="app.mgStart()">▶ Começar</button>
        <button class="btn" onclick="app.mgMove(1)">▶</button>
      </div>
    </div>

    <div class="card">
      <h2>🚗 Simulador de troca de carro</h2>
      <p class="desc">Seu carro atual faz <b>${fmtKm(S.consumo)} km/L</b> (${COMBUSTIVEIS[S.combustivel].nome}). E se trocasse? Calcule a economia mensal (10.000 km/ano):</p>
      <div class="form-grid">
        <div><label>Ano do carro novo</label><input type="number" id="troca-ano" value="2024" min="1980" max="2026"></div>
        <div><label>Consumo novo (km/L)</label><input type="number" id="troca-kml" value="13" min="3" max="30" step="0.1"></div>
        <div style="grid-column:1/-1"><label>Combustível do carro novo</label>
          <select id="troca-comb">${Object.keys(COMBUSTIVEIS).map(k => `<option value="${k}" ${k === 'GASOLINA' ? 'selected' : ''}>${COMBUSTIVEIS[k].nome} — ${fmt(precos()[k])}</option>`).join('')}</select>
        </div>
      </div>
      <button class="btn btn-azul btn-grande" style="margin-top:10px" onclick="app.calcularTroca()">🧮 Calcular economia</button>
      <div class="resultado-troca" id="troca-resultado"></div>
    </div>

    <div class="card">
      <h2>🏆 Conquistas <small>${Object.keys(S.conq).length}/${CONQUISTAS.length}</small></h2>
      <p class="desc">${CONQUISTAS.map(c => (S.conq[c.id] ? c.ico : '🔒')).join(' ')}</p>
      <p class="desc">${CONQUISTAS.filter(c => !S.conq[c.id]).slice(0, 3).map(c => `→ ${c.nome}: <i>${c.desc}</i>`).join('<br>') || 'Todas conquistadas! Você é lenda. 👑'}</p>
    </div>

    <div class="card">
      <h2>ℹ️ Sobre</h2>
      <p class="desc">🚗 <b>Vida Brasil</b> v1.0 — jogo de vida cotidiana, trânsito e finanças brasileiras. Feito com ❤️ em HTML/CSS/JS, 100% offline.<br>
      Valores de combustível são aproximados e apenas para diversão.</p>
      <div class="btn-linha">
        <a class="btn" style="text-align:center;text-decoration:none" href="https://github.com/guilhermedacostasilvadesouza-cpu/vida-brasil/releases/latest" target="_blank" rel="noopener">📲 Baixar o APK</a>
        <button class="btn btn-verm" onclick="app.confirmarReset()">🗑️ Zerar progresso</button>
      </div>
    </div>`;

  prepararCanvas();
}

function viradaSemana() {
  const todasFeitas = DESAFIOS.every(d => clamp(d.get(S), 0, d.meta) >= d.meta);
  if (!todasFeitas) { som('err'); return; }
  S.semana++;
  S.semanasPerfeitas++;
  S.dinheiro = r2(S.dinheiro + 60);
  S.w = { viagens: 0, km: 0, quiz: 0, abast: 0, semSustos: 0 };
  delete S.flags.cestaSem;
  ganhaXp(50);
  checarConquistas();
  salvar(); renderTudo();
  confete(); som('level');
  toast('🌙 Semana ' + (S.semana - 1) + ' perfeita! +R$ 60, +50 XP', true);
}

function calcularTroca() {
  const ano = parseInt($('#troca-ano').value, 10) || 2024;
  const kml = clamp(parseFloat($('#troca-kml').value) || 13, 2, 40);
  const combN = $('#troca-comb').value;
  const kmMes = 10000 / 12;
  const precoNovo = preco(combN);
  const custoNovo = kmMes / (kml * fatorComb(combN)) * precoNovo;
  const custoAtual = kmMes / (S.consumo * fatorComb(S.combustivel)) * preco(S.combustivel);
  const economia = r2(custoAtual - custoNovo);
  const idade = Math.max(0, 2026 - ano);
  const deprec = Math.round(Math.max(0, (idade - 5)) * 0.8);
  const el = $('#troca-resultado');
  el.style.display = 'block';
  if (economia > 0) {
    if (economia >= 40) S.flags.trocaEco = true;
    checarConquistas(); salvar();
    el.innerHTML = `
      <b style="color:var(--verde2)">✅ Vale a pena trocar!</b><br>
      Carro atual: <b>${fmt(custoAtual)}/mês</b><br>
      Carro novo (${kml} km/L, ${COMBUSTIVEIS[combN].nome}): <b>${fmt(custoNovo)}/mês</b><br>
      Economia: <b style="color:var(--amarelo)">${fmt(economia)}/mês</b> 🎉
      ${deprec > 0 ? `<br><span style="color:var(--mut)">⚠️ Carro ${ano} bem usado: IPVA/seguro um tiquinho maiores (+${fmt(deprec)}/mês)</span>` : ''}`;
    som('coin');
  } else {
    el.innerHTML = `
      <b style="color:var(--verm)">🤔 Não compensa (ainda)!</b><br>
      Carro atual: <b>${fmt(custoAtual)}/mês</b><br>
      Carro novo: <b>${fmt(custoNovo)}/mês</b><br>
      Você gastaria <b>${fmt(Math.abs(economia))} a mais</b> por mês. Seu carrinho velho tem valor! ❤️‍🔥`;
    som('click');
  }
}

function confirmarReset() {
  modal('🗑️ Zerar tudo?', 'Isso apaga nome, dinheiro, XP e conquistas. Não tem volta!', [
    { txt: 'Cancelar' },
    { txt: 'Zerar tudo', cls: 'btn-verm', fn: () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} location.reload(); } }
  ]);
}

/* ============================================================
   MINIGAME: SinalVida
   ============================================================ */
const MG = { rodando: false, raf: 0, ultimo: 0, offset: 0, score: 0, px: 4, fileiras: [], vel: .9, pausado: true };
const MG_COLS = 8, MG_W = 300, MG_H = 430, MG_FILEIRA = 64;

function prepararCanvas() {
  const cv = $('#mg-canvas');
  if (!cv) return;
  MG.ctx = cv.getContext('2d');
  MG.fileiras = []; MG.offset = 0; MG.score = 0; MG.px = 4; MG.pausado = true;
  while (MG.fileiras.length < 8) MG.fileiras.push(novaFileira());
  mgDesenho();
  cv.onpointerdown = e => {
    const r = cv.getBoundingClientRect();
    app.mgMove((e.clientX - r.left) < r.width / 2 ? -1 : 1);
  };
}
function novaFileira() {
  const pista = Math.random() < .68;
  const cars = [];
  if (pista) {
    const n = rnd(1, 2);
    for (let i = 0; i < n; i++) {
      const dir = Math.random() < .5 ? -1 : 1;
      cars.push({ x: rndf(0, MG_W), v: dir * rndf(70, 150), cor: pick(['#ff5262', '#40a2ff', '#ffd600', '#b388ff', '#00e676', '#ff9100']) });
    }
  }
  return { pista, cars };
}
function mgStart() {
  if (!MG.ctx) prepararCanvas();
  MG.rodando = true; MG.pausado = false;
  MG.fileiras = []; MG.offset = 0; MG.score = 0; MG.px = 4; MG.vel = .9;
  while (MG.fileiras.length < 8) MG.fileiras.push(novaFileira());
  MG.ultimo = performance.now();
  cancelAnimationFrame(MG.raf);
  MG.raf = requestAnimationFrame(mgLoop);
  som('click');
  const b = $('#mg-start'); if (b) b.textContent = '↻ Reiniciar';
}
function mgPausa(p) {
  if (p && MG.rodando) MG.pausado = true;
}
function mgFim() {
  MG.rodando = false; MG.pausado = true;
  cancelAnimationFrame(MG.raf);
  som('crash');
  const recorde = MG.score > S.stats.mgBest;
  if (recorde) S.stats.mgBest = MG.score;
  S.flags.mgVivo = true;
  ganhaXp(Math.floor(MG.score / 5), true);
  checarConquistas(); salvar();
  if (MG.score >= 50) { confete(); }
  modal(MG.score >= 50 ? '🎮 Sobrevivente da Avenida!' : '💥 Bateu!', `
    Você atravessou <b>${MG.score} fileiras</b> do trânsito mais caótico do Brasil.<br>
    ${recorde ? '🥇 <b>Novo recorde pessoal!</b>' : 'Recorde: ' + S.stats.mgBest}<br>
    <b style="color:var(--verde2)">+${Math.floor(MG.score / 5)} XP</b>`,
    [{ txt: 'De novo! 🎮', cls: 'btn-primario', fn: mgStart }, { txt: 'Fechar' }]);
}
function mgLoop(t) {
  if (!MG.rodando) return;
  const dt = Math.min(.05, (t - MG.ultimo) / 1000);
  MG.ultimo = t;
  if (!MG.pausado) {
    MG.vel = Math.min(2.3, .9 + MG.score * .025);
    MG.offset += MG.vel * MG_FILEIRA * dt;
    if (MG.offset >= MG_FILEIRA) {
      MG.offset -= MG_FILEIRA;
      MG.fileiras.pop();
      MG.fileiras.unshift(novaFileira());
      MG.score++;
      const el = $('#mg-score'); if (el) el.textContent = 'Fileiras: ' + MG.score;
    }
    for (const f of MG.fileiras) for (const c of f.cars) {
      c.x += c.v * dt;
      if (c.x < -80) c.x = MG_W + 40; if (c.x > MG_W + 80) c.x = -40;
    }
    /* colisão: jogador ocupa a fileira do meio-baixo */
    const pyTop = MG_H - 120;
    const idx = Math.floor((MG_H - (pyTop + MG_FILEIRA - MG.offset)) / MG_FILEIRA);
    const fr = MG.fileiras[clamp(idx, 0, MG.fileiras.length - 1)];
    if (fr && fr.pista) {
      const pxPx = MG.px * (MG_W / MG_COLS) + (MG_W / MG_COLS) / 2;
      for (const c of fr.cars) {
        if (Math.abs(c.x - pxPx) < 34) { mgFim(); return; }
      }
    }
  }
  mgDesenho();
  MG.raf = requestAnimationFrame(mgLoop);
}
function mgDesenho() {
  const ctx = MG.ctx; if (!ctx) return;
  ctx.clearRect(0, 0, MG_W, MG_H);
  for (let i = 0; i < MG.fileiras.length; i++) {
    const fr = MG.fileiras[i];
    const y = MG_H - (i + 1) * MG_FILEIRA + MG.offset;
    if (fr.pista) {
      ctx.fillStyle = '#1c2333'; ctx.fillRect(0, y, MG_W, MG_FILEIRA);
      ctx.strokeStyle = '#39445f'; ctx.setLineDash([12, 10]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MG_W, y); ctx.stroke(); ctx.setLineDash([]);
    } else {
      ctx.fillStyle = '#173425'; ctx.fillRect(0, y, MG_W, MG_FILEIRA);
      ctx.fillStyle = '#1d4230';
      for (let x = 12; x < MG_W; x += 48) { ctx.beginPath(); ctx.arc(x, y + 32, 7, 0, 7); ctx.fill(); }
    }
    for (const c of fr.cars) {
      ctx.fillStyle = c.cor;
      const cw = 46, ch = 22;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(c.x - cw / 2, y + MG_FILEIRA / 2 - ch / 2, cw, ch, 6);
      else ctx.rect(c.x - cw / 2, y + MG_FILEIRA / 2 - ch / 2, cw, ch);
      ctx.fill();
      ctx.fillStyle = '#fffbe6';
      const frente = c.v > 0 ? c.x + cw / 2 - 5 : c.x - cw / 2;
      ctx.fillRect(frente - 2, y + MG_FILEIRA / 2 - 6, 4, 4);
      ctx.fillRect(frente - 2, y + MG_FILEIRA / 2 + 2, 4, 4);
    }
  }
  /* jogador */
  const cw = MG_W / MG_COLS;
  const px = MG.px * cw + cw / 2, py = MG_H - 96;
  ctx.fillStyle = '#ffd600';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(px - 17, py - 13, 34, 26, 7);
  else ctx.rect(px - 17, py - 13, 34, 26);
  ctx.fill();
  ctx.fillStyle = '#0c1220';
  ctx.fillRect(px + 2, py - 8, 12, 10);
  ctx.fillStyle = '#00e676';
  ctx.fillRect(px + 14, py - 4, 4, 4);
}
function mgMove(dir) {
  if (!MG.rodando || MG.pausado) return;
  MG.px = clamp(MG.px + dir, 0, MG_COLS - 1);
  som('click');
}
document.addEventListener('keydown', e => {
  if (!MG.rodando) return;
  if (e.key === 'ArrowLeft') mgMove(-1);
  if (e.key === 'ArrowRight') mgMove(1);
});

/* ============================================================
   ONBOARDING & BOOT
   ============================================================ */
const AVATARES = ['🚙', '🚕', '🏎️', '🛻', '🚐', '🏍️'];
let onbAvatar = '🚙';

function montarOnboarding() {
  const grid = $('#onb-avatares');
  grid.innerHTML = AVATARES.map(a => `<button class="onb-av ${a === onbAvatar ? 'sel' : ''}" onclick="app.selAvatar('${a}')">${a}</button>`).join('');
}
function selAvatar(a) { onbAvatar = a; montarOnboarding(); som('click'); }
function comecar() {
  const nome = ($('#onb-nome').value || '').trim().slice(0, 16) || 'Motorista';
  S = estadoNovo(nome, onbAvatar);
  salvar();
  $('#onboarding').classList.add('oculto');
  som('level'); confete();
  toast('🚦 Boa viagem, ' + nome + '! Você está em ' + S.cidade, true);
  renderTudo();
}

function atualizarPrecosDoDia() {
  if (S.dia !== hojeStr()) {
    S.dia = hojeStr();
    S.gasMod = rndf(0.96, 1.05);
    setTimeout(() => toast('📉📈 Boletim do dia: preços dos combustíveis mudaram!'), 800);
    salvar();
  }
}

function boot() {
  S = carregar();
  if (!S) {
    $('#onboarding').classList.remove('oculto');
    montarOnboarding();
    S = estadoNovo('Motorista', '🚙'); // estado provisório para os renders
  } else {
    atualizarPrecosDoDia();
  }
  renderTudo();
  // tabs
  $$('.tab').forEach(t => t.addEventListener('click', () => mostraTela(t.dataset.tela)));
  // PWA
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
}

/* expõe a API para os onclick inline */
const app = {
  mostraTela, fecharModal, comecar, selAvatar,
  dirigir, escolherComb, abastecer, novaDica,
  comprar, cestaCompleta,
  responder, proxima, iniciarQuiz,
  viradaSemana, calcularTroca, confirmarReset,
  mgStart, mgMove, ganhaXp, estado: () => S, quizAtual: () => Q
};
window.app = app;

document.addEventListener('DOMContentLoaded', boot);

window.app = app;

document.addEventListener('DOMContentLoaded', boot);
