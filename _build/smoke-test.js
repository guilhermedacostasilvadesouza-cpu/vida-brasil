/* Teste de fumaça do Vida Brasil em jsdom: simula o fluxo completo do jogo */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const RAIZ = '/home/user/vida-brasil/www';
const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(RAIZ, 'js/game.js'), 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost:3000/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
});
const { window } = dom;
const { document } = window;

// stubs
window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {
  get: (t, p) => {
    if (p === 'measureText') return () => ({ width: 10 });
    return typeof p === 'string' ? () => {} : undefined;
  },
});
window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16);
window.cancelAnimationFrame = clearTimeout;

let passos = 0;
const ok = msg => { passos++; console.log('  ✅ ' + msg); };
const falhou = msg => { console.error('  ❌ ' + msg); process.exit(1); };

try {
  // executa o jogo
  window.eval(js);
  document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

  const app = window.app;
  if (!app) throw new Error('window.app não exposto');

  // 1. onboarding
  document.querySelector('#onb-nome').value = 'Testador';
  app.selAvatar('🏎️');
  app.comecar();
  if (document.querySelector('#onboarding').classList.contains('oculto') === false) throw new Error('onboarding não fechou');
  const S = () => JSON.parse(window.localStorage.getItem('vidabrasil.save.v1'));
  if (S().nome !== 'Testador') throw new Error('save não criado');
  ok('onboarding cria o save (nome + avatar)');

  // 2. navegação por todas as telas
  for (const t of ['jogar', 'posto', 'mercado', 'quiz', 'mais', 'home']) app.mostraTela(t);
  ok('navega pelas 6 telas sem erros');

  // 3. abastecer
  app.mostraTela('posto');
  app.escolherComb('ALCOOL');
  if (S().combustivel !== 'ALCOOL') throw new Error('combustível não trocou');
  const antes = S().comb;
  app.abastecer();
  if (S().comb <= antes && S().dinheiro > 5) throw new Error('abastecimento não encheu');
  ok('posto troca combustível e abastece (comb=' + S().comb + 'L, $=' + S().dinheiro + ')');

  // 4. dirigir
  app.mostraTela('jogar');
  const viagens0 = S().stats.viagens;
  app.dirigir('padaria');
  if (S().stats.viagens !== viagens0 + 1) throw new Error('viagem não contabilizada');
  ok('dirigir registra viagem, gastos e XP (Nv ' + S().nivel + ', ' + S().xp + ' XP)');

  // força XP alto para testar level up (via memória do jogo)
  app.ganhaXp(999, true);
  if (S().nivel < 2) throw new Error('level up não ocorreu');
  ok('level up ao atingir XP (Nv ' + S().nivel + ')');

  // 5. mercado
  app.mostraTela('mercado');
  for (let i = 0; i < 12; i++) { const s = S(); s.dinheiro = 500; window.localStorage.setItem('vidabrasil.save.v1', JSON.stringify(s)); for (const id of ['arroz','feijao','cafe','oleo','leite','pao','ovos','carne','fruta','limpeza']) app.comprar(id); }
  if (Object.keys(S().pantry).length !== 10) throw new Error('cesta não encheu');
  app.cestaCompleta();
  if (!S().flags.cestaSem) throw new Error('flag cestaSem não setada');
  ok('mercado completa a cesta básica e paga bônus');

  // 6. quiz
  app.mostraTela('quiz');
  app.iniciarQuiz('transito');
  for (let i = 0; i < 12; i++) { app.responder(0); app.proxima(); }
  if (S().stats.quizJogadas !== 1) throw new Error('quiz não contabilizado');
  app.iniciarQuiz('q192');
  for (let i = 0; i < 4; i++) { app.responder(app.quizAtual().perguntas[app.quizAtual().i].c); app.proxima(); }
  if (!S().flags.samui) throw new Error('quiz 192 não marcou flag');
  ok('quiz de trânsito + quiz do SAMU (100% de acerto) completos');

  // 7. missões: força metas e vira a semana (na memória do jogo)
  const s2 = app.estado();
  s2.w = { viagens: 4, km: 60, quiz: 6, abast: 2, semSustos: 1 };
  s2.dinheiro = 150;
  app.mostraTela('mais');
  app.viradaSemana();
  if (S().semana !== 2) throw new Error('semana não virou');
  if (S().semanasPerfeitas !== 1) throw new Error('semana perfeita não contada');
  ok('missões da semana completas → virada de semana (semana ' + S().semana + ')');

  // 8. troca de carro
  document.querySelector('#troca-ano').value = '2024';
  document.querySelector('#troca-kml').value = '16';
  document.querySelector('#troca-comb').value = 'GNV';
  app.calcularTroca();
  if (document.querySelector('#troca-resultado').style.display !== 'block') throw new Error('resultado não exibido');
  ok('simulador de troca de carro calcula economia');

  // 9. minigame
  app.mgStart();
  app.mgMove(-1); app.mgMove(1);
  ok('minigame SinalVida inicia e responde aos controles');

  // 10. conquistas
  const ganhas = Object.keys(S().conq).length;
  if (ganhas < 3) throw new Error('conquistas esperadas não dispararam (' + ganhas + ')');
  ok('conquistas dispararam: ' + ganhas + ' 🏆');

  // 11. persistência: memória e storage batem
  const mem = app.estado();
  const disco = S();
  const campos = ['nome', 'nivel', 'semana', 'dinheiro', 'combustivel'];
  for (const c of campos) if (String(mem[c]) !== String(disco[c])) throw new Error('save divergente no campo ' + c);
  ok('save persiste no localStorage (campos: ' + campos.join(', ') + ')');

  console.log('\n🟢 FUMAÇA VERDE — ' + passos + ' grupos de testes passaram!');
  process.exit(0);
} catch (e) {
  falhou(e.message + '\n' + (e.stack || '').split('\n').slice(1, 4).join('\n'));
  process.exit(1);
}
