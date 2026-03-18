/* =========================================
   TOYS (imagens + labels)
   ========================================= */
const IMAGE_PATH = './images/';
const COMMANDS = [
  { label: 'BALL',        file: 'ball.png' },
  { label: 'PLANE',       file: 'plane.png' },
  { label: 'DOLL',        file: 'doll.png' },
  { label: 'HELICOPTER',  file: 'helicopter.png' },
  { label: 'SCOOTER',     file: 'scooter.png' },
  { label: 'BICYCLE',     file: 'bicycle.png' },
  { label: 'KITE',        file: 'kite.png' },
  { label: 'PUZZLE',      file: 'puzzles.png' },
  { label: 'TRUCK',       file: 'truck.png' },
  { label: 'TEDDY BEAR',  file: 'teddy-bear.png' },
  { label: 'TRAIN',       file: 'train.png' },
  { label: 'YO-YO',       file: 'yo-yo.png' }
];

/* =========================================
   Estado
   ========================================= */
let palavrasNivel = [];           // {label, file, grid}
let grid = [];                    // matriz de letras
let palavrasEncontradas = [];     // labels encontradas
let palavrasReveladas = [];       // labels reveladas ao clicar no card
let palavraTemp = '';
let celulasSelecionadas = [];
let mouseDown = false;

let score  = Number(localStorage.getItem('scoreToys')  || 0);
let medals = Number(localStorage.getItem('medalsToys') || 0);

// UI
const scoreEl  = () => document.getElementById('score');
const medalsEl = () => document.getElementById('medals');
const ulList   = () => document.getElementById('listaPalavras');
const btnNext  = () => document.getElementById('btnNovaRodada');
const nivelSel = () => document.getElementById('nivel');

// Sons (opcionais)
const sClick = () => document.getElementById('click-sound');
const sOK    = () => document.getElementById('correct-sound');
const sErr   = () => document.getElementById('wrong-sound');

/* =========================================
   Utils
   ========================================= */
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function pickN(a,n){ return shuffle([...a]).slice(0,n); }
function gridify(label){ return label.toUpperCase().replace(/[^A-Z]/g,''); }
function play(el){ try{ if(el){ el.currentTime=0; el.play(); } }catch(e){} }
function isSmall(){ return window.innerWidth < 768; }

/* =========================================
   Confete
   ========================================= */
function popConfetti(){
  const layer = document.getElementById('confetti');
  [...layer.children].forEach(n => n.remove()); // limpa
  for(let i=0;i<80;i++){
    const s = document.createElement('span');
    s.textContent = Math.random() < .5 ? '🎉' : '⭐';
    s.style.position='absolute';
    s.style.left = (Math.random()*100)+'vw';
    s.style.top  = '-10vh';
    s.style.fontSize = (16 + Math.random()*22)+'px';
    s.style.transform = `rotate(${Math.random()*360}deg)`;
    s.style.animation = `fall ${2 + Math.random()*1.5}s linear forwards`;
    layer.appendChild(s);
    setTimeout(()=>s.remove(), 3500);
  }
}

/* =========================================
   Regras de TAMANHO (fixas) + filtro de palavras
   ========================================= */
function getGridSizeByLevel(){
  const nivel = (nivelSel()?.value || 'facil').toLowerCase();
  if (nivel === 'dificil') return { linhas: 13, colunas: 13 };
  return { linhas: 10, colunas: 10 }; // fácil
}

function filtrarPorTamanhoGrid(lista, linhas, colunas){
  // remove palavras cujo comprimento ultrapasse a DIMENSÃO MÁXIMA DIRECIONAL do grid
  // como só colocamos horizontal/vertical, usamos o maior dos lados
  const maxLen = Math.max(linhas, colunas);
  return lista.filter(p => gridify(p.label).length <= maxLen);
}

/* =========================================
   Gerar rodada
   ========================================= */
function gerarCacaPalavras(){
  palavrasEncontradas = [];
  palavrasReveladas = [];
  palavraTemp = '';
  celulasSelecionadas = [];

  document.getElementById('cacaPalavrasContainer').innerHTML = '';
  ulList().innerHTML = '';
  btnNext().style.display = 'none';

  // Define grid fixo conforme nível
  let { linhas, colunas } = getGridSizeByLevel();

  // Em telas pequenas, mantemos as mesmas dimensões lógicas do grid;
  // o ajuste visual é feito via CSS (@media) reduzindo o tamanho das células.

  // Filtra o catálogo por tamanho do grid ANTES de sortear a rodada
  const elegiveis = filtrarPorTamanhoGrid(COMMANDS, linhas, colunas);

  // Garante que sempre teremos 4 palavras; se não, avisa no console e usa o que houver (fallback)
  let pool = elegiveis.length >= 4 ? elegiveis : COMMANDS.filter(p => gridify(p.label).length <= Math.max(linhas, colunas));

  // Sorteia 4 brinquedos para a rodada
  const pick = pickN(pool, Math.min(4, pool.length));
  palavrasNivel = pick.map(p => ({ label: p.label, file: p.file, grid: gridify(p.label) }));

  gerarGrid(linhas, colunas);
  exibirGrid(colunas);
  exibirLista();

  // Esconde o seletor no mobile (apenas visual)
  if (isSmall()) nivelSel().style.display = 'none';
  else           nivelSel().style.display = 'inline';

  atualizarStatus();
}

function gerarGrid(rows, cols){
  grid = Array(rows).fill().map(()=>Array(cols).fill(''));
  preencherPalavras();
  preencherVazios();
}

function preencherPalavras(){
  // horizontal ou vertical
  palavrasNivel.forEach(p => {
    let ok=false, tries=0;
    while(!ok && tries<1500){
      tries++;
      const r = Math.floor(Math.random()*grid.length);
      const c = Math.floor(Math.random()*grid[0].length);
      const dirs = [{x:1,y:0},{x:0,y:1}];
      const d = dirs[Math.floor(Math.random()*dirs.length)];
      const rf = r + d.y*(p.grid.length-1);
      const cf = c + d.x*(p.grid.length-1);
      if(rf<0||rf>=grid.length||cf<0||cf>=grid[0].length) continue;
      let clash=false;
      for(let i=0;i<p.grid.length;i++){
        const rr=r+d.y*i, cc=c+d.x*i;
        if(grid[rr][cc]!=='' && grid[rr][cc]!==p.grid[i]){ clash=true; break; }
      }
      if(clash) continue;
      for(let i=0;i<p.grid.length;i++){
        const rr=r+d.y*i, cc=c+d.x*i;
        grid[rr][cc]=p.grid[i];
      }
      ok=true;
    }
  });
}

function preencherVazios(){
  const L='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  grid.forEach((linha,r)=>{
    linha.forEach((val,c)=>{
      if(grid[r][c]==='') grid[r][c]=L[Math.floor(Math.random()*L.length)];
    });
  });
}

/* =========================================
   Renderização
   ========================================= */
function exibirGrid(cols){
  const container = document.getElementById('cacaPalavrasContainer');
  const gc = document.createElement('div');
  gc.className='grid-container';
  gc.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  grid.forEach((linha,r)=>{
    linha.forEach((letra,c)=>{
      const cell = document.createElement('div');
      cell.className='cell';
      cell.textContent = letra;
      cell.dataset.r=r; cell.dataset.c=c;

      // eventos (mouse)
      cell.addEventListener('mousedown', startSel);
      cell.addEventListener('mouseover', moveSel);
      cell.addEventListener('mouseup', endSel);

      // eventos (touch)
      cell.addEventListener('touchstart', (e)=>{ e.preventDefault(); startSel({target:cell}); }, {passive:false});
      cell.addEventListener('touchmove',  (e)=>{
        e.preventDefault();
        const t = e.touches[0];
        const el = document.elementFromPoint(t.clientX, t.clientY);
        if(el && el.classList.contains('cell')) moveSel({target:el});
      }, {passive:false});
      cell.addEventListener('touchend',   ()=> endSel());

      gc.appendChild(cell);
    });
  });

  container.appendChild(gc);
}

function exibirLista(){
  const ul = ulList();
  ul.innerHTML = '';
  palavrasNivel.forEach(p=>{
    const li = document.createElement('li');

    const img = document.createElement('img');
    img.src = IMAGE_PATH + p.file;
    img.alt = p.label;
    img.dataset.word = p.label;
    img.addEventListener('click', ()=>{
      li.classList.add('revealed');
      if(!palavrasReveladas.includes(p.label)) palavrasReveladas.push(p.label);
      play(sClick());
    });

    const span = document.createElement('span');
    span.className='word-text';
    span.textContent = p.label;

    li.appendChild(img);
    li.appendChild(span);
    ul.appendChild(li);
  });
}

/* =========================================
   Seleção de letras
   ========================================= */
function startSel(e){
  if(!e.target.classList.contains('cell')) return;
  mouseDown = true;
  palavraTemp = e.target.textContent;
  celulasSelecionadas = [e.target];
  e.target.classList.add('selecionada');
}
function moveSel(e){
  if(!mouseDown) return;
  const cell = e.target;
  if(!cell.classList.contains('cell')) return;
  if(celulasSelecionadas.includes(cell)) return;

  const last = celulasSelecionadas[celulasSelecionadas.length-1];
  const r = +cell.dataset.r, c = +cell.dataset.c;
  const lr= +last.dataset.r, lc= +last.dataset.c;

  const isHoriz = (r===lr) && Math.abs(c-lc)===1;
  const isVert  = (c===lc) && Math.abs(r-lr)===1;

  if(isHoriz || isVert){
    cell.classList.add('selecionada');
    palavraTemp += cell.textContent;
    celulasSelecionadas.push(cell);
  }
}
function endSel(){
  if(!mouseDown) return;
  mouseDown = false;

  // Verifica ANTES de limpar seleção para preservar as células corretas em verde
  verificarPalavra();

  // Remove apenas a classe de seleção transitória
  document.querySelectorAll('.selecionada').forEach(c=>c.classList.remove('selecionada'));
  celulasSelecionadas = [];
  palavraTemp = '';
}

/* =========================================
   Verificação e progresso
   ========================================= */
function verificarPalavra(){
  const sel = palavraTemp.toUpperCase();
  let acerto = null;

  for(const p of palavrasNivel){
    if(p.grid === sel){ acerto = p; break; }
  }

  if(acerto && !palavrasEncontradas.includes(acerto.label)){
    palavrasEncontradas.push(acerto.label);

    // mantém as letras selecionadas em VERDE permanente
    celulasSelecionadas.forEach(cell => cell.classList.add('found'));

    // atualiza lista (cards)
    ulList().querySelectorAll('li').forEach(li=>{
      const w = li.querySelector('.word-text').textContent;
      if(w === acerto.label) li.classList.add('found','revealed');
    });

    // pontuação
    score += 1;
    localStorage.setItem('scoreToys', String(score));
    atualizarStatus();
    play(sOK());

    verificarVitoria();
  } else {
    play(sErr());
  }
}

function verificarVitoria(){
  if(palavrasEncontradas.length === 4){
    // medalha
    medals += 1;
    localStorage.setItem('medalsToys', String(medals));
    atualizarStatus();

    // confete + próxima rodada
    popConfetti();
    btnNext().style.display = 'inline-block';

    // bloqueia interação no grid até a próxima rodada
    document.getElementById('cacaPalavrasContainer').style.pointerEvents = 'none';
  }
}

/* =========================================
   Status e próxima rodada
   ========================================= */
function atualizarStatus(){
  scoreEl().textContent = String(score);
  const m = medalsEl();
  m.innerHTML = '';
  for(let i=0;i<medals;i++){
    const s = document.createElement('span');
    s.textContent = '🏅';
    m.appendChild(s);
  }
}
btnNext().addEventListener('click', ()=>{
  // limpa confete
  const layer = document.getElementById('confetti');
  [...layer.children].forEach(n=>n.remove());

  document.getElementById('cacaPalavrasContainer').style.pointerEvents = 'auto';
  gerarCacaPalavras();
});

/* =========================================
   Start
   ========================================= */
window.addEventListener('load', ()=>{
  atualizarStatus();
  gerarCacaPalavras();
});