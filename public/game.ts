// ===============================
// Configuração base do jogo
// - Tamanhos de canvas, campo, jogadores, bola e gols
// - Esses valores são usados em vários pontos (desenho, colisão, etc.)
// ===============================
// Configuração do jogo
interface Config {
  canvas: {
    width: number;
    height: number;
  };
  field: {
    cornerSize: number;
  };
  player: {
    radius: number;
  };
  ball: {
    radius: number;
  };
  goal: {
    width: number;
    height: number;
  };
}

const config: Config = {
  canvas: {
    width: 800,
    height: 600,
  },
  field: {
    cornerSize: 80,
  },
  player: {
    radius: 20,
  },
  ball: {
    radius: 10,
  },
  goal: {
    width: 50,
    height: 200,
  },
};

const TEAM_PRESENTATION = {
  red: {
    name: 'Flamengo',
    badge: '/flamengo-botao.png',
  },
  blue: {
    name: 'Palmeiras',
    badge: '/palmeiras-botao.png',
  },
} as const;

function getTeamDisplayName(team: 'red' | 'blue'): string {
  return TEAM_PRESENTATION[team].name;
}

function createTeamBadgeButton(team: 'red' | 'blue'): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `team-badge-button ${team}`;
  button.disabled = true;

  const logo = document.createElement('img');
  logo.src = TEAM_PRESENTATION[team].badge;
  logo.alt = `Escudo ${getTeamDisplayName(team)}`;
  logo.loading = 'lazy';

  const label = document.createElement('span');
  label.textContent = getTeamDisplayName(team);

  button.appendChild(logo);
  button.appendChild(label);
  return button;
}

const TEAM_BADGE_IMAGES: Record<'red' | 'blue', HTMLImageElement> = {
  red: new Image(),
  blue: new Image(),
};

TEAM_BADGE_IMAGES.red.src = TEAM_PRESENTATION.red.badge;
TEAM_BADGE_IMAGES.blue.src = TEAM_PRESENTATION.blue.badge;

// ===============================
// Elementos do DOM
// - Criamos tudo via JavaScript para deixar o index.html mais limpo
// - `container` agrupa canvas, HUD e telas de feedback (espera, vencedor, etc.)
// ===============================
interface Elements {
  container: HTMLDivElement;
  canvas: HTMLCanvasElement;
  ui: HTMLDivElement;
  waitingScreen: HTMLDivElement;
  winnerDisplay: HTMLDivElement;
  restartButton: HTMLButtonElement;
  roomInfo: HTMLDivElement;
  ping: HTMLDivElement;
  scoreboard: HTMLDivElement;
  hudBottom: HTMLDivElement;
  timerBottom: HTMLDivElement;
  goalscorersPanel: HTMLDivElement;
  redGoalscorers: HTMLDivElement;
  blueGoalscorers: HTMLDivElement;
}

const elements: Elements = {
  container: document.createElement('div'),
  canvas: document.createElement('canvas'),
  ui: document.createElement('div'),
  waitingScreen: document.createElement('div'),
  winnerDisplay: document.createElement('div'),
  restartButton: document.createElement('button'),
  roomInfo: document.createElement('div'),
  ping: document.createElement('div'),
  scoreboard: document.createElement('div'),
  hudBottom: document.createElement('div'),
  timerBottom: document.createElement('div'),
  goalscorersPanel: document.createElement('div'),
  redGoalscorers: document.createElement('div'),
  blueGoalscorers: document.createElement('div'),
};

// ===============================
// Estado do jogo (client-side)
// - Guarda informações que o cliente precisa para desenhar e interagir
// - `gameState` é sincronizado pelo servidor via Socket.IO
// - `inputs` guarda o que o jogador está apertando no momento
// ===============================
interface PlayerInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  action: boolean;
}

interface Ball {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
  lastTouchPlayerId?: string | null;
  lastTouchTeam?: 'red' | 'blue' | null;
}

interface Score {
  red: number;
  blue: number;
}

interface Teams {
  red: string[];
  blue: string[];
}

interface Player {
  x: number;
  y: number;
  team: 'red' | 'blue';
  input: Omit<PlayerInput, 'action'>;
  goals: number;
  lastGoalTime: number;
  username?: string; // Nome do usuário ou "Convidado X"
}

interface GameState {
  players: { [socketId: string]: Player };
  ball: Ball;
  score: Score;
  teams: Teams;
  matchTime: number;
  isPlaying: boolean;
  width: number;
  height: number;
}

interface State {
  matchEnded: boolean;
  canMove: boolean;
  currentTeam: 'red' | 'blue' | 'spectator';
  roomId: string | null;
  roomCapacity: number;
  roomPlayerCount: number;
  requestedRoomId: string | null;
  ping: number | null;
  pingStartTime: number | null; // Timestamp quando enviamos o ping
  inputs: PlayerInput;
  gameState: GameState;
  isMobile: boolean;
}

// Estado inicial do jogo no cliente
const state: State = {
  matchEnded: false,
  canMove: false,
  currentTeam: 'spectator',
  roomId: null,
  roomCapacity: 0,
  roomPlayerCount: 0,
  requestedRoomId: null,
  ping: null, // Latência em ms
  pingStartTime: null, // Timestamp quando enviamos o ping
  inputs: { left: false, right: false, up: false, down: false, action: false },
  gameState: {
    players: {},
    ball: { x: 400, y: 300, radius: config.ball.radius, speedX: 0, speedY: 0 },
    score: { red: 0, blue: 0 },
    teams: { red: [], blue: [] },
    matchTime: 60,
    isPlaying: false,
    width: config.canvas.width,
    height: config.canvas.height,
  },
  isMobile: false,
};

// Recupera o ID da sala da URL (?room=XYZ)
function getRequestedRoomId(): string | null {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('room');
  return value ? value.trim() : null;
}

// Verifica se o dispositivo é móvel (touch)
// Usado para decidir se mostramos controles de joystick na tela
function isMobileDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

// Inicialização do canvas e container principal do jogo
// - Cria o contexto 2D
// - Ajusta o tamanho "lógico" do canvas
// - Faz um resize inicial para caber melhor na tela do usuário
function initCanvas(): CanvasRenderingContext2D {
  const ctx = elements.canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Não foi possível obter o contexto 2D do canvas');
  }

  elements.container.id = 'game-container';
  document.body.appendChild(elements.container);

  elements.canvas.width = config.canvas.width;
  elements.canvas.height = config.canvas.height;
  elements.container.appendChild(elements.canvas);

  resizeCanvasForViewport();

  return ctx;
}

// Ajusta o tamanho VISUAL do canvas (CSS) mantendo a proporção
// O tamanho lógico (config.canvas.width/height) continua o mesmo
function resizeCanvasForViewport(): void {
  const aspect = config.canvas.width / config.canvas.height;
  const maxWidth = Math.min(window.innerWidth - 24, 900);
  const width = Math.max(280, maxWidth);
  const height = width / aspect;
  elements.canvas.style.width = `${width}px`;
  elements.canvas.style.height = `${height}px`;
}

// Atualiza o display de ping
// - Se ainda não medimos, mostra "-- ms"
// - Depois que o servidor responde, mostra a latência medida
function atualizarDisplayPing(): void {
  if (!elements.ping) return;
  if (state.ping === null) {
    elements.ping.textContent = 'Ping: -- ms';
  } else {
    elements.ping.textContent = `Ping: ${state.ping} ms`;
  }
}

const ctx = initCanvas();
state.isMobile = isMobileDevice();

// ===============================
// Inicialização da UI
// - Cria HUD inferior (ping, cronômetro, placar)
// - Cria elementos de texto (esperando jogador, vencedor, info da sala)
// - Tudo é anexado ao `elements.container`
// ===============================
function initUI(): void {
  elements.ping.id = 'ping';
  elements.ping.textContent = 'Ping: -- ms';

  elements.ui.id = 'game-ui';
  elements.waitingScreen.id = 'waiting-screen';
  elements.waitingScreen.textContent = 'Aguardando outro jogador...';
  elements.winnerDisplay.id = 'winner-display';
  elements.roomInfo.id = 'room-info';
  elements.roomInfo.textContent = 'Conectando a uma sala...';
  elements.restartButton.id = 'restart-button';
  elements.restartButton.textContent = 'Jogar Novamente';
  elements.restartButton.style.display = 'none';

  elements.ui.appendChild(elements.waitingScreen);
  elements.ui.appendChild(elements.winnerDisplay);
  elements.ui.appendChild(elements.roomInfo);
  elements.ui.appendChild(elements.restartButton);

  // HUD inferior
  elements.hudBottom.id = 'hud-bottom';
  elements.timerBottom.id = 'timer-bottom';
  elements.timerBottom.textContent = '1:00';
  elements.scoreboard.id = 'scoreboard';
  elements.scoreboard.textContent = `${getTeamDisplayName('red')}: 0 | ${getTeamDisplayName('blue')}: 0`;

  elements.hudBottom.appendChild(elements.ping);
  elements.hudBottom.appendChild(elements.timerBottom);
  elements.hudBottom.appendChild(elements.scoreboard);

  // Painel de artilheiros (direita da tela)
  elements.goalscorersPanel.id = 'goalscorers-panel';
  elements.redGoalscorers.id = 'red-goalscorers';
  elements.redGoalscorers.className = 'goalscorers-list red';
  elements.blueGoalscorers.id = 'blue-goalscorers';
  elements.blueGoalscorers.className = 'goalscorers-list blue';

  elements.redGoalscorers.appendChild(createTeamBadgeButton('red'));
  elements.blueGoalscorers.appendChild(createTeamBadgeButton('blue'));

  elements.goalscorersPanel.appendChild(elements.redGoalscorers);
  elements.goalscorersPanel.appendChild(elements.blueGoalscorers);

  // Cria wrapper para canvas e painel de artilheiros lado a lado
  const canvasWrapper = document.createElement('div');
  canvasWrapper.id = 'game-canvas-wrapper';
  canvasWrapper.appendChild(elements.canvas);
  canvasWrapper.appendChild(elements.ui);
  canvasWrapper.appendChild(elements.goalscorersPanel);

  elements.container.appendChild(canvasWrapper);
  elements.container.appendChild(elements.hudBottom);
}


initUI();
atualizarDisplayPing();

state.requestedRoomId = getRequestedRoomId();
state.roomId = state.requestedRoomId;

// Salva o ID da sala na URL (?room=XYZ)
// Assim o jogador pode recarregar a página ou compartilhar o link
function persistRoomInUrl(roomId: string): void {
  if (!roomId) return;
  const params = new URLSearchParams(window.location.search);
  params.set('room', roomId);
  const query = params.toString();
  window.history.replaceState({}, '', `/${query ? `?${query}` : ''}`);
  state.requestedRoomId = roomId;
}

// Atualiza o texto que mostra qual sala o jogador está
// Ex.: "Sala abc123 (1/4)"
function updateRoomInfoDisplay(): void {
  if (!elements.roomInfo) return;
  if (!state.roomId) {
    elements.roomInfo.textContent = 'Conectando a uma sala...';
    return;
  }
  const playersInRoom = state.roomPlayerCount || Object.keys(state.gameState.players).length;
  const capacityText = state.roomCapacity ? ` (${playersInRoom}/${state.roomCapacity})` : '';
  elements.roomInfo.textContent = `Sala ${state.roomId}${capacityText}`;
}

updateRoomInfoDisplay();

// ===============================
// Conexão com o servidor (Socket.IO)
// - Enviamos opcionalmente o roomId desejado
// - Enviamos também informações de autenticação (userId e username)
// - O servidor decide se aloca em uma sala existente ou cria outra
// ===============================
// Socket.IO é carregado via CDN no HTML e tipos são fornecidos por @types/socket.io-client

// Recupera informações do usuário do sessionStorage
const userId = sessionStorage.getItem('userId');
const username = sessionStorage.getItem('username');
const isGuest = sessionStorage.getItem('isGuest') === 'true';

// Conecta ao servidor Socket.IO, enviando roomId, userId e username, assim o servidor pode autenticar e alocar na sala correta
const socket = io('/', {
  query: { 
    roomId: state.requestedRoomId || '',
    userId: isGuest ? '' : (userId || ''),
    username: isGuest ? 'Convidado' : (username || 'Convidado'),
  },
});

// ===============================
// Handlers de eventos do Socket.IO
// Cada chave do objeto abaixo corresponde a um evento vindo do servidor
// ===============================
interface InitData {
  team: 'red' | 'blue';
  gameState: Partial<GameState>;
  canMove: boolean;
  roomId?: string;
}

interface RoomAssignedData {
  roomId: string;
  capacity: number;
  players: number;
}

interface RoomFullData {
  roomId: string;
  capacity: number;
}

interface PlayerConnectedData {
  playerId: string;
  team: 'red' | 'blue';
  gameState: { teams: Teams };
}

interface UpdateData {
  players: { [socketId: string]: Player };
  ball: Ball;
  score: Score;
  teams: Teams;
  matchTime: number;
  isPlaying: boolean;
  roomId?: string;
}

interface MatchStartData {
  gameState: Partial<GameState>;
  canMove: boolean;
}

interface PlayerReadyUpdateData {
  players: { [socketId: string]: Player };
  readyCount: number;
  totalPlayers: number;
  canMove: boolean;
}

interface TeamChangedData {
  newTeam: 'red' | 'blue';
  gameState: GameState;
}

interface PlayerDisconnectedData {
  playerId: string;
  gameState: GameState;
}

interface MatchEndData {
  winner: 'red' | 'blue' | 'draw';
  gameState: GameState;
}

interface TimerUpdateData {
  matchTime: number;
}

interface WaitingForPlayersData {
  redCount: number;
  blueCount: number;
}

interface GoalScoredData {
  team: 'red' | 'blue';
  goalScoredBy?: string;
}

interface BallResetData {
  ball: Ball;
}

const socketHandlers = {
  init: (data: InitData) => {
    state.currentTeam = data.team;
    state.gameState = { ...state.gameState, ...data.gameState };
    state.canMove = data.canMove;
    state.roomId = data.roomId || state.roomId;
    state.roomPlayerCount = Object.keys(state.gameState.players).length;
    if (data.roomId) {
      persistRoomInUrl(data.roomId);
    }
    updateRoomInfoDisplay();
    updateUI();
  },

  roomAssigned: (data: RoomAssignedData) => {
    state.roomId = data.roomId;
    state.roomCapacity = data.capacity;
    state.roomPlayerCount = data.players;
    persistRoomInUrl(data.roomId);
    updateRoomInfoDisplay();
  },

  roomFull: (data: RoomFullData) => {
    const message = `Sala ${data.roomId} está cheia (${data.capacity} jogadores). Escolha outra sala.`;
    elements.waitingScreen.style.display = 'block';
    elements.waitingScreen.textContent = message;
    state.canMove = false;
    alert(message);
  },

  sessionTaken: (data: { message: string }) => {
    // Desconectar do jogo e redirecionar para tela de login
    alert(data.message);
    sessionStorage.clear(); // Limpa dados da sessão
    window.location.href = '/auth.html';
  },

  playerConnected: (data: PlayerConnectedData) => {
    if (state.gameState.teams.red.length + state.gameState.teams.blue.length < 2) {
      elements.winnerDisplay.textContent = '';
      elements.winnerDisplay.style.display = 'none';
      state.matchEnded = false;
    }

    state.gameState.players[data.playerId] = {
      x: data.team === 'red' ? 100 : 700,
      y: 300,
      team: data.team,
      input: { left: false, right: false, up: false, down: false },
      goals: 0,
      lastGoalTime: 0,
    };
    state.gameState.teams = data.gameState.teams;
    state.canMove = state.gameState.teams.red.length > 0 && state.gameState.teams.blue.length > 0;
    state.roomPlayerCount = Object.keys(state.gameState.players).length;
    updateRoomInfoDisplay();
    updateUI();
  },

  update: (newState: UpdateData) => {
    state.gameState = { ...state.gameState, ...newState };
    state.roomId = newState.roomId || state.roomId;
    state.roomPlayerCount = Object.keys(state.gameState.players).length;
    state.canMove =
      state.gameState.isPlaying &&
      ((state.currentTeam === 'red' && state.gameState.teams.blue.length > 0) ||
        (state.currentTeam === 'blue' && state.gameState.teams.red.length > 0));
    updateRoomInfoDisplay();
    updateUI();
  },

  cleanPreviousMatch: () => {
    elements.winnerDisplay.textContent = '';
    elements.winnerDisplay.style.display = 'none';
    state.matchEnded = false;
    elements.redGoalscorers.innerHTML = '';
    elements.blueGoalscorers.innerHTML = '';
    draw();
  },

  matchStart: (data: MatchStartData) => {
    state.gameState = { ...state.gameState, ...data.gameState, isPlaying: true };
    state.matchEnded = false;
    state.canMove = true;
    state.roomPlayerCount = Object.keys(state.gameState.players).length;
    updateRoomInfoDisplay();
    hideWinner();
    updateUI();
  },

  playerReadyUpdate: (data: PlayerReadyUpdateData) => {
    state.gameState.players = data.players;
    state.roomPlayerCount = Object.keys(state.gameState.players).length;
    updateRoomInfoDisplay();
    if (state.matchEnded) {
      const readyText = `Prontos: ${data.readyCount}/${data.totalPlayers}`;
      elements.waitingScreen.textContent =
        state.currentTeam === 'spectator'
          ? 'Aguardando jogadores...'
          : `Você está pronto! ${readyText}`;
      state.canMove = false;
    }
    draw();
  },

  waitingForOpponent: () => {
    elements.waitingScreen.textContent = 'Aguardando outro jogador para começar...\n';
    elements.restartButton.style.display = 'none';
  },

  teamChanged: (data: TeamChangedData) => {
    state.currentTeam = data.newTeam;
    state.gameState = data.gameState;
    if (state.gameState.players[socket.id]) {
      state.gameState.players[socket.id].x = state.currentTeam === 'red' ? 100 : 700;
      state.gameState.players[socket.id].y = 300;
    }
    alert(`Você foi movido para o ${getTeamDisplayName(state.currentTeam)}`);
    updateUI();
  },

  playerDisconnected: (data: PlayerDisconnectedData) => {
    state.gameState = data.gameState;
    delete state.gameState.players[data.playerId];
    state.roomPlayerCount = Object.keys(state.gameState.players).length;
    updateRoomInfoDisplay();
    updateUI();
    if (
      state.matchEnded &&
      state.gameState.teams.red.length > 0 &&
      state.gameState.teams.blue.length > 0
    ) {
      socket.emit('requestRestart');
    }
  },

  matchEnd: (data: MatchEndData) => {
    state.gameState.isPlaying = false;
    state.matchEnded = true;
    state.gameState.players = data.gameState.players;
    state.roomPlayerCount = Object.keys(state.gameState.players).length;
    updateRoomInfoDisplay();
    showWinner(data.winner);
    elements.restartButton.style.display = 'block';
    elements.waitingScreen.textContent = 'Partida terminada. Aguardando todos jogadores...';
    elements.waitingScreen.style.display = 'block';
  },

  timerUpdate: (data: TimerUpdateData) => {
    state.gameState.matchTime = data.matchTime;
    updateTimerDisplay();
  },

  waitingForPlayers: (data: WaitingForPlayersData) => {
    const waitingText = `Aguardando jogadores... ${getTeamDisplayName('red')}: ${data.redCount} | ${getTeamDisplayName('blue')}: ${data.blueCount}`;
    elements.waitingScreen.textContent = waitingText;
    elements.waitingScreen.style.display = 'block';
    state.canMove = false;
    state.roomPlayerCount = data.redCount + data.blueCount;
    updateRoomInfoDisplay();
    updateUI();
  },

  goalScored: (data: GoalScoredData) => {
    state.gameState.ball.x = -1000;
    state.gameState.ball.y = -1000;
    console.log(`GOL do ${getTeamDisplayName(data.team)}!`);
  },

  ballReset: (data: BallResetData) => {
    state.gameState.ball = data.ball;
  },
};

// Registrar handlers de todos os eventos definidos acima
// Isso evita a repetição de `socket.on(...)` para cada evento
// O socket.on chama a função handler correspondente quando o evento é recebido
// Cada handler atualiza o estado do jogo e a UI conforme necessário
Object.entries(socketHandlers).forEach(([event, handler]) => {
  socket.on(event, handler);
});

// Medição de ping usando RTT (Round-Trip Time)
// - Cliente envia ping request com timestamp
// - Servidor responde imediatamente com pong
// - Cliente calcula latência como (tempo_atual - tempo_enviado) / 2
socket.on('pingRequest', () => {
  state.pingStartTime = Date.now();
  socket.emit('pong');
});

socket.on('pongResponse', () => {
  if (state.pingStartTime !== null) {
    const now = Date.now();
    const rtt = now - state.pingStartTime; // Round-Trip Time
    state.ping = Math.round(rtt / 2); // Latência é metade do RTT
    state.pingStartTime = null;
    atualizarDisplayPing();
  }
});

// ===============================
// Funções de UI
// ===============================
function updateUI(): void {
  updateRoomInfoDisplay();
  updateScoreboard();
  updateGoalscorersPanel();
  if (state.matchEnded) {
    elements.waitingScreen.style.display = 'block';
    elements.waitingScreen.textContent = 'Partida terminada. Aguardando todos jogadores...\n';
    state.canMove = false;
  } else {
    const hasOpponent =
      (state.currentTeam === 'red' && state.gameState.teams.blue.length > 0) ||
      (state.currentTeam === 'blue' && state.gameState.teams.red.length > 0);
    elements.waitingScreen.style.display = hasOpponent ? 'none' : 'block';
    state.canMove = hasOpponent && state.gameState.isPlaying;
  }
}

// Atualiza o texto do placar no HUD inferior com ranking de gols
function updateScoreboard(): void {
  if (!elements.scoreboard) return;
  
  // Obtém placar dos times
  const redScore = state.gameState.score.red;
  const blueScore = state.gameState.score.blue;
  
  // Cria ranking de jogadores por gols
  const playerGoals: Array<{ id: string; team: 'red' | 'blue'; goals: number }> = [];
  
  for (const [id, player] of Object.entries(state.gameState.players)) {
    if (player) {
      playerGoals.push({
        id: id.substring(0, 5),
        team: player.team,
        goals: player.goals || 0,
      });
    }
  }
  
  // Ordena por gols (descendente)
  playerGoals.sort((a, b) => b.goals - a.goals);
  
  // Monta a string do placar
  let scoreboardText = `${getTeamDisplayName('red')}: ${redScore} | ${getTeamDisplayName('blue')}: ${blueScore}`;
  

  
  elements.scoreboard.textContent = scoreboardText;
}

// Desenha o ID de cada jogador acima da cabeça (ajustado ao tamanho do canvas na tela)
function updatePlayerIDs(): void {
  document.querySelectorAll('.player-id').forEach((el) => el.remove());

  for (const [id, player] of Object.entries(state.gameState.players)) {
    if (player) {
      const idElement = document.createElement('div');
      idElement.className = 'player-id';
      // Mostra o username ao invés do ID
      idElement.textContent = player.username || id.substring(0, 5);

      if (id === socket.id) {
        idElement.classList.add('my-player');
      }

      const canvasRect = elements.canvas.getBoundingClientRect();
      const scaleX = canvasRect.width / config.canvas.width;
      const scaleY = canvasRect.height / config.canvas.height;

      idElement.style.position = 'absolute';
      idElement.style.left = `${canvasRect.left + player.x * scaleX}px`;
      idElement.style.top = `${canvasRect.top + player.y * scaleY - config.player.radius + 10}px`;
      idElement.style.zIndex = '10';
      document.body.appendChild(idElement);
    }
  }
}

// Atualiza o painel vertical de artilheiros dividido em duas colunas
function updateGoalscorersPanel(): void {
  if (!elements.redGoalscorers || !elements.blueGoalscorers) return;

  // Cria listas de artilheiros por time
  const redGoalscorers: Array<{ id: string; playerId: string; goals: number; lastGoalTime: number }> = [];
  const blueGoalscorers: Array<{ id: string; playerId: string; goals: number; lastGoalTime: number }> = [];

  for (const [id, player] of Object.entries(state.gameState.players)) {
    if (player && player.goals > 0) {
      // Use username se disponível, senão ID truncado
      const displayName = player.username || id.substring(0, 5);
      const playerInfo = { id: displayName, playerId: id, goals: player.goals, lastGoalTime: player.lastGoalTime };
      if (player.team === 'red') {
        redGoalscorers.push(playerInfo);
      } else {
        blueGoalscorers.push(playerInfo);
      }
    }
  }

  // Ordena por gols descendente, depois por lastGoalTime descendente (mais recente)
  const sortGoalscorers = (a: typeof redGoalscorers[0], b: typeof redGoalscorers[0]) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    return b.lastGoalTime - a.lastGoalTime;
  };

  redGoalscorers.sort(sortGoalscorers);
  blueGoalscorers.sort(sortGoalscorers);

  // Limpa as listas
  elements.redGoalscorers.innerHTML = '';
  elements.blueGoalscorers.innerHTML = '';

  elements.redGoalscorers.appendChild(createTeamBadgeButton('red'));
  elements.blueGoalscorers.appendChild(createTeamBadgeButton('blue'));

  // Renderiza artilheiros vermelhos
  redGoalscorers.forEach((scorer, index) => {
    const div = document.createElement('div');
    div.className = 'goalscorer-item';
    const isCaptain = index === 0 && redGoalscorers[0].goals > 0;
    if (isCaptain) {
      div.classList.add('captain');
    }
    div.textContent = `${isCaptain ? '👑 ' : ''}${scorer.id} (${scorer.goals})`;
    elements.redGoalscorers.appendChild(div);
  });

  // Renderiza artilheiros azuis
  blueGoalscorers.forEach((scorer, index) => {
    const div = document.createElement('div');
    div.className = 'goalscorer-item';
    const isCaptain = index === 0 && blueGoalscorers[0].goals > 0;
    if (isCaptain) {
      div.classList.add('captain');
    }
    div.textContent = `${isCaptain ? '👑 ' : ''}${scorer.id} (${scorer.goals})`;
    elements.blueGoalscorers.appendChild(div);
  });
}

function showWinner(winner: 'red' | 'blue' | 'draw'): void {
  elements.winnerDisplay.style.display = 'block';
  elements.winnerDisplay.style.opacity = '1';
  elements.winnerDisplay.textContent = winner === 'draw' ? 'Empate!' : `${getTeamDisplayName(winner)} venceu!`;
}

function hideWinner(): void {
  elements.winnerDisplay.style.opacity = '0';
  setTimeout(() => {
    elements.winnerDisplay.style.display = 'none';
  }, 500);
}

// Atualiza o cronômetro mostrado no HUD inferior
function updateTimerDisplay(): void {
  const minutes = Math.floor(state.gameState.matchTime / 60);
  const seconds = state.gameState.matchTime % 60;
  const text = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  elements.timerBottom.textContent = text;
}

// ===============================
// Controles
// - Configura joystick virtual para mobile
// - Configura botão de ação (se visível)
// - Atualiza o objeto `state.inputs` que será enviado ao servidor
// ===============================
function setupControls(): void {
  const mobileControls = document.getElementById('mobile-controls');
  if (!mobileControls) return;

  // Ativa controles no mobile; esconde o botão de chute
  if (state.isMobile) {
    mobileControls.style.display = 'flex';
    const actionBtnHide = document.getElementById('action-btn');
    if (actionBtnHide) actionBtnHide.style.display = 'none';
  }

  if (mobileControls.style.display === 'none') return;

  const joystickThumb = document.getElementById('joystick-thumb');
  const joystickBase = document.getElementById('joystick-base');
  const actionBtn = document.getElementById('action-btn');

  if (!joystickThumb || !joystickBase) {
    console.warn('Elementos de controle móvel não encontrados');
    return;
  }

  let activeTouchId: number | string | null = null;
  const joystickRadius = 50;
  let centerPosition = { x: 0, y: 0 };

  const recalcCenter = () => {
    const rect = joystickBase.getBoundingClientRect();
    centerPosition = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };
  recalcCenter();

  window.addEventListener('resize', recalcCenter);
  window.addEventListener('scroll', recalcCenter, { passive: true });

  const updateJoystickPosition = (touch: { clientX: number; clientY: number }) => {
    const touchX = touch.clientX - centerPosition.x;
    const touchY = touch.clientY - centerPosition.y;

    const distance = Math.sqrt(touchX * touchX + touchY * touchY);
    const angle = Math.atan2(touchY, touchX);

    const limitedDistance = Math.min(distance, joystickRadius);
    const newX = Math.cos(angle) * limitedDistance;
    const newY = Math.sin(angle) * limitedDistance;

    (joystickThumb as HTMLElement).style.transform = `translate(${newX}px, ${newY}px)`;

    const deadZone = 0.2;
    const normalizedX = newX / joystickRadius;
    const normalizedY = newY / joystickRadius;

    state.inputs.left = normalizedX < -deadZone;
    state.inputs.right = normalizedX > deadZone;
    state.inputs.up = normalizedY < -deadZone;
    state.inputs.down = normalizedY > deadZone;
  };

  const resetJoystick = () => {
    (joystickThumb as HTMLElement).style.transform = 'translate(0, 0)';
    activeTouchId = null;
    state.inputs.left = false;
    state.inputs.right = false;
    state.inputs.up = false;
    state.inputs.down = false;
  };

  joystickBase.addEventListener('touchstart', (e: TouchEvent) => {
    if (activeTouchId !== null) return;
    const touch = e.changedTouches[0];
    activeTouchId = touch.identifier;
    recalcCenter();
    updateJoystickPosition(touch);
    e.preventDefault();
  });

  document.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (activeTouchId === null) return;
      const touch = Array.from(e.changedTouches).find((t) => t.identifier === activeTouchId);
      if (touch) {
        updateJoystickPosition(touch);
        e.preventDefault();
      }
    },
    { passive: false }
  );

  document.addEventListener('touchend', (e: TouchEvent) => {
    const touch = Array.from(e.changedTouches).find((t) => t.identifier === activeTouchId);
    if (touch) {
      resetJoystick();
      e.preventDefault();
    }
  });

  joystickBase.addEventListener('mousedown', (e: MouseEvent) => {
    if (activeTouchId !== null) return;
    activeTouchId = 'mouse';
    recalcCenter();
    updateJoystickPosition(e);
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (activeTouchId === 'mouse') {
      updateJoystickPosition(e);
      e.preventDefault();
    }
  });

  document.addEventListener('mouseup', () => {
    if (activeTouchId === 'mouse') {
      resetJoystick();
    }
  });

  // Botão de ação (fica oculto no mobile; mantém funcionalidade para desktop se visível)
  if (actionBtn) {
    const handleActionStart = () => {
      state.inputs.action = true;
      actionBtn.style.backgroundColor = 'rgba(255, 0, 0, 0.6)';
    };

    const handleActionEnd = () => {
      state.inputs.action = false;
      actionBtn.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
    };

    actionBtn.addEventListener('touchstart', handleActionStart);
    actionBtn.addEventListener('touchend', handleActionEnd);
    actionBtn.addEventListener('mousedown', handleActionStart);
    actionBtn.addEventListener('mouseup', handleActionEnd);
    actionBtn.addEventListener('mouseleave', handleActionEnd);
  }
}

// ===============================
// Renderização principal do jogo
// - Desenha campo, áreas, gols, jogadores e bola
// - Chama `updatePlayerIDs` para alinhar labels com o canvas
// - Usa `requestAnimationFrame(draw)` para animar continuamente
// ===============================
function draw(): void {
  try {
    ctx.clearRect(0, 0, config.canvas.width, config.canvas.height);

    // Fundo base
    ctx.fillStyle = '#28412f';
    ctx.fillRect(0, 0, config.canvas.width, config.canvas.height);

    // Textura de gramado
    const stripeHeight = 24;
    for (let y = 0; y < config.canvas.height; y += stripeHeight) {
      ctx.fillStyle = Math.floor(y / stripeHeight) % 2 === 0 ? '#2f4b37' : '#25382b';
      ctx.fillRect(0, y, config.canvas.width, stripeHeight);
    }

    // Cantos triangulares
    const cornerSize = config.field.cornerSize || 0;
    if (cornerSize > 0) {
      ctx.fillStyle = '#1f2f35';

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(cornerSize, 0);
      ctx.lineTo(0, cornerSize);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(config.canvas.width - cornerSize, 0);
      ctx.lineTo(config.canvas.width, 0);
      ctx.lineTo(config.canvas.width, cornerSize);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, config.canvas.height - cornerSize);
      ctx.lineTo(0, config.canvas.height);
      ctx.lineTo(cornerSize, config.canvas.height);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(config.canvas.width - cornerSize, config.canvas.height);
      ctx.lineTo(config.canvas.width, config.canvas.height);
      ctx.lineTo(config.canvas.width, config.canvas.height - cornerSize);
      ctx.closePath();
      ctx.fill();
    }

    // Linhas do campo
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    const padding = 0;
    const innerWidth = config.canvas.width - padding * 2;
    const innerHeight = config.canvas.height - padding * 2;

    ctx.strokeRect(padding, padding, innerWidth, innerHeight);

    // Linha central
    ctx.beginPath();
    ctx.moveTo(config.canvas.width / 2, padding);
    ctx.lineTo(config.canvas.width / 2, config.canvas.height - padding);
    ctx.stroke();

    // Círculo central
    ctx.beginPath();
    ctx.arc(config.canvas.width / 2, config.canvas.height / 2, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(config.canvas.width / 2, config.canvas.height / 2, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#f5f5f5';
    ctx.fill();

    // Áreas e gols
    const bigBoxWidth = 140;
    const bigBoxHeight = 260;
    const smallBoxWidth = 70;
    const smallBoxHeight = 140;
    const goalLineTop = (config.canvas.height - bigBoxHeight) / 2;
    const goalLineBottom = goalLineTop + bigBoxHeight;

    ctx.strokeRect(padding, goalLineTop, bigBoxWidth, bigBoxHeight);
    ctx.strokeRect(padding, (config.canvas.height - smallBoxHeight) / 2, smallBoxWidth, smallBoxHeight);
    ctx.beginPath();
    ctx.arc(padding + 90, config.canvas.height / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeRect(config.canvas.width - padding - bigBoxWidth, goalLineTop, bigBoxWidth, bigBoxHeight);
    ctx.strokeRect(
      config.canvas.width - padding - smallBoxWidth,
      (config.canvas.height - smallBoxHeight) / 2,
      smallBoxWidth,
      smallBoxHeight
    );
    ctx.beginPath();
    ctx.arc(config.canvas.width - padding - 90, config.canvas.height / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(padding + bigBoxWidth, config.canvas.height / 2, 60, Math.PI * 1.5, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(config.canvas.width - padding - bigBoxWidth, config.canvas.height / 2, 60, Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();

    // Gols
    ctx.fillStyle = '#ff000055';
    ctx.fillRect(0, config.canvas.height / 2 - config.goal.height / 2, config.goal.width, config.goal.height);
    ctx.fillStyle = '#0000ff55';
    ctx.fillRect(
      config.canvas.width - config.goal.width,
      config.canvas.height / 2 - config.goal.height / 2,
      config.goal.width,
      config.goal.height
    );

    // Object.entries retorna um array de [chave, valor] para cada propriedade do objeto
    // Jogadores
    for (const [id, player] of Object.entries(state.gameState.players)) {
      if (player) {
        ctx.globalAlpha = state.matchEnded && !state.canMove ? 0.7 : 1.0;
        ctx.fillStyle = player.team;
        ctx.beginPath();
        ctx.arc(player.x, player.y, config.player.radius, 0, Math.PI * 2);
        ctx.fill();

        // Desenha o escudo do time sobre o jogador, mantendo o formato circular.
        const badgeImage = TEAM_BADGE_IMAGES[player.team];
        const badgeRadius = config.player.radius - 2;
        if (badgeImage.complete && badgeImage.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(player.x, player.y, badgeRadius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(
            badgeImage,
            player.x - badgeRadius,
            player.y - badgeRadius,
            badgeRadius * 2,
            badgeRadius * 2
          );
          ctx.restore();
        }

        ctx.globalAlpha = 1.0;

        if (id === socket.id) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(player.x, player.y, config.player.radius + 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // Bola
    if (state.gameState.ball.x >= -50 && state.gameState.ball.x <= config.canvas.width + 50) {
      // Define a cor da bola baseado no último toque
      let ballColor = '#ffffff'; // Branco por padrão
      if (state.gameState.ball.lastTouchTeam === 'red') {
        ballColor = '#ff0000'; // Vermelho se último toque foi do time vermelho
      } else if (state.gameState.ball.lastTouchTeam === 'blue') {
        ballColor = '#0000ff'; // Azul se último toque foi do time azul
      }
      
      ctx.fillStyle = ballColor;
      ctx.beginPath();
      ctx.arc(state.gameState.ball.x, state.gameState.ball.y, state.gameState.ball.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sem placar / cronômetro desenhados no canvas (fica no HUD inferior)
  } catch (error) {
    console.error('Erro na renderização:', error);
  }

  updatePlayerIDs();
  updateGoalscorersPanel();
  requestAnimationFrame(draw);
}

// ===============================
// Event listeners globais (carregamento, resize e teclado)
// ===============================
window.addEventListener('load', () => {
  if (state.isMobile || /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) mobileControls.style.display = 'flex';
    const actionBtn = document.getElementById('action-btn');
    if (actionBtn) actionBtn.style.display = 'none';
  }

  setupControls();
  resizeCanvasForViewport();
});

// Redimensiona canvas e reposiciona labels quando a janela mudar de tamanho
window.addEventListener('resize', () => {
  resizeCanvasForViewport();
  updatePlayerIDs();
});

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (!state.canMove || state.currentTeam === 'spectator' || state.matchEnded) return;

  switch (e.key) {
    case 'ArrowLeft':
      state.inputs.left = true;
      break;
    case 'ArrowRight':
      state.inputs.right = true;
      break;
    case 'ArrowUp':
      state.inputs.up = true;
      break;
    case 'ArrowDown':
      state.inputs.down = true;
      break;
  }
});

window.addEventListener('keyup', (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowLeft':
      state.inputs.left = false;
      break;
    case 'ArrowRight':
      state.inputs.right = false;
      break;
    case 'ArrowUp':
      state.inputs.up = false;
      break;
    case 'ArrowDown':
      state.inputs.down = false;
      break;
  }
});

// Botão "Jogar Novamente" após o fim da partida
elements.restartButton.addEventListener('click', () => {
  socket.emit('requestRestart');
  elements.restartButton.style.display = 'none';
  elements.waitingScreen.textContent = 'Você está pronto! Aguardando adversário...\n';
});

// Loop de input
// - A cada frame (~60 FPS) envia o estado atual das teclas para o servidor
setInterval(() => {
  if (state.currentTeam !== 'spectator' && state.canMove) {
    socket.emit('input', state.inputs);
  }
}, 1000 / 60);

// Inicia o loop de renderização do jogo
draw();