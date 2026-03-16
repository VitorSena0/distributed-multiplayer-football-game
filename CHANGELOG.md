# Changelog - Sistema de Autenticação e Estatísticas

## [2.1.0] - 2024-12-24

### 🎉 Novas Funcionalidades

#### Ranking Expandido
- ✅ Painel de ranking expandido de 280px para 420px
- ✅ Adicionadas 3 novas colunas de estatísticas:
  - **DER**: Derrotas
  - **EMP**: Empates  
  - **PJ**: Partidas Jogadas
- ✅ Layout em grid com 7 colunas para melhor organização
- ✅ Cores distintas para cada tipo de estatística:
  - Vitórias (VIT): Verde
  - Derrotas (DER): Vermelho
  - Empates (EMP): Amarelo
  - Saldo de Gols (SG): Azul
  - Partidas Jogadas (PJ): Roxo

#### Sistema de Identificação de Jogadores
- ✅ Usernames são exibidos acima dos jogadores ao invés de IDs aleatórios
- ✅ Convidados recebem numeração sequencial ("Convidado 1", "Convidado 2", etc.)
- ✅ Numeração automática até no máximo "Convidado 6" (capacidade máxima da sala)
- ✅ Usernames também exibidos no painel de artilheiros

#### Segurança de Sessão
- ✅ Sistema de detecção de sessão duplicada implementado
- ✅ Apenas uma sessão ativa por conta de usuário
- ✅ Desconexão automática da sessão anterior ao fazer login em novo dispositivo/aba
- ✅ Notificação ao usuário quando sessão é encerrada por login em outro local
- ✅ Convidados não são afetados (podem ter múltiplas sessões)

#### Interface de Autenticação
- ✅ Mensagem de segurança adicionada na tela de registro
- ✅ Informação sobre proteção de dados com bcrypt e JWT
- ✅ Design verde harmonioso indicando segurança

### 🔧 Mudanças Técnicas

#### Backend
- Adicionado `Map<number, string>` para rastrear sessões ativas em `socketHandlers.ts`
- Lógica de contagem de convidados na sala para numeração sequencial
- Verificação de sessão duplicada ao conectar novo socket
- Remoção automática de usuário do mapa ao desconectar

#### Frontend
- Atualizado interface `Player` para incluir campo `username`
- Função `updatePlayerIDs()` modificada para exibir username
- Função `updateGoalscorersPanel()` modificada para exibir username
- Novo handler `sessionTaken` para tratar desconexão por sessão duplicada
- Redirecionamento automático para `/auth.html` com limpeza de sessionStorage

#### UI/UX
- Expandido grid do ranking de 4 para 7 colunas
- Espaçamento reduzido entre colunas (4px) para melhor aproveitamento
- Adicionado estilo `.security-notice` em `auth-style.css`
- Background gradiente verde para mensagem de segurança

### 🐛 Correções
- Corrigido problema de TypeScript com `previousSocketId` undefined

## [2.0.0] - 2024-12-23

### 🎉 Funcionalidades Adicionadas

#### Sistema de Autenticação
- ✅ Página de login e registro (`/auth.html`)
- ✅ Sistema de autenticação com JWT (JSON Web Tokens)
- ✅ Criptografia de senhas com bcrypt
- ✅ Validação de usuário único
- ✅ Opção de jogar como convidado (sem salvar estatísticas)
- ✅ Redirecionamento automático para login se não autenticado
- ✅ Verificação de token ao recarregar página

#### Banco de Dados PostgreSQL 17
- ✅ Tabela `users` para armazenar usuários
- ✅ Tabela `player_stats` para armazenar estatísticas
- ✅ Índices otimizados para consultas de ranking
- ✅ Relação 1:1 entre usuários e estatísticas
- ✅ ON DELETE CASCADE para limpeza automática

#### Sistema de Estatísticas
- ✅ Salvamento automático após partidas completas
- ✅ Rastreamento de:
  - Gols marcados
  - Gols sofridos
  - Saldo de gols
  - Vitórias
  - Derrotas
  - Empates
  - Total de partidas jogadas

#### Ranking Global
- ✅ Painel lateral exibindo TOP 10 jogadores
- ✅ Atualização automática a cada 30 segundos
- ✅ Ordenação por: Vitórias > Saldo de Gols > Gols Marcados
- ✅ Design responsivo para mobile e desktop

#### API REST
- ✅ `POST /api/auth/register` - Registrar novo usuário
- ✅ `POST /api/auth/login` - Fazer login
- ✅ `POST /api/auth/verify` - Verificar token
- ✅ `GET /api/auth/stats/:userId` - Buscar estatísticas
- ✅ `GET /api/auth/ranking` - Buscar ranking global

### 🔧 Mudanças Técnicas

#### Backend
- Adicionado `pg` para conexão com PostgreSQL
- Adicionado `bcryptjs` para criptografia de senhas
- Adicionado `jsonwebtoken` para autenticação JWT
- Criado `database/db.ts` para gerenciar conexão
- Criado `services/authService.ts` com lógica de autenticação
- Criado `routes/authRoutes.ts` com endpoints da API
- Atualizado `game-server.ts` para incluir middleware JSON e rotas
- Atualizado `game/types.ts` para incluir `userId` e `username` no Player
- Atualizado `game/match.ts` para salvar estatísticas ao fim da partida
- Atualizado `game/socketHandlers.ts` para receber dados de autenticação

#### Frontend
- Criado `public/auth.html` - Interface de login/registro
- Criado `public/auth-style.css` - Estilos da autenticação
- Criado `public/auth.js` - Lógica de autenticação no cliente
- Atualizado `public/index.html` para:
  - Verificar autenticação
  - Exibir painel de ranking
  - Carregar ranking automaticamente
- Atualizado `public/style.css` para estilos do ranking
- Atualizado `public/game.ts` para enviar dados de usuário via Socket.IO

#### Docker e Infraestrutura
- Atualizado `docker-compose.yml` para incluir PostgreSQL 17
- Adicionado volume persistente para dados do banco
- Adicionado healthcheck para PostgreSQL
- Configuradas variáveis de ambiente para conexão

#### Documentação
- Criado `DATABASE.md` - Documentação do banco de dados
- Criado `API.md` - Documentação completa da API
- Criado `DEPLOY.md` - Guia de deploy com Docker
- Criado `.env.example` - Exemplo de variáveis de ambiente
- Atualizado `README.md` com informações sobre autenticação
- Criado `scripts/init-db.sh` - Script para inicializar banco local
- Criado `database/schema.sql` - Schema do banco de dados
- Criado `database/migration.sql` - Script de migração

### 🔒 Segurança

- Senhas armazenadas com hash bcrypt (10 salt rounds)
- Tokens JWT com expiração de 30 dias
- Validação de entrada em todos os endpoints
- Proteção contra SQL injection (queries parametrizadas)
- Usuários únicos (constraint UNIQUE)
- Variáveis de ambiente para dados sensíveis

### 📊 Estatísticas Salvas

As seguintes estatísticas são salvas automaticamente para usuários registrados:

1. **Total de gols marcados** - Soma de todos os gols feitos
2. **Total de gols sofridos** - Soma de todos os gols que o time levou
3. **Saldo de gols** - Diferença entre gols marcados e sofridos
4. **Vitórias** - Partidas vencidas
5. **Derrotas** - Partidas perdidas
6. **Empates** - Partidas empatadas
7. **Total de partidas** - Contagem de partidas completas

> **Nota**: Estatísticas só são atualizadas quando a partida chega ao final (matchTime = 0)

### 🎮 Modos de Jogo

1. **Usuário Registrado**: Cria conta, faz login, estatísticas são salvas
2. **Convidado**: Joga sem criar conta, estatísticas não são salvas
3. **Ambos**: Podem jogar juntos na mesma partida

### 🏆 Sistema de Ranking

O ranking é calculado baseado em:
1. Maior número de vitórias
2. Maior saldo de gols
3. Maior número de gols marcados

Exibido em tempo real no painel lateral esquerdo da tela do jogo.

### 📦 Dependências Adicionadas

```json
{
  "dependencies": {
    "pg": "^8.x",
    "bcryptjs": "^2.x",
    "jsonwebtoken": "^9.x"
  },
  "devDependencies": {
    "@types/pg": "^8.x",
    "@types/bcryptjs": "^2.x",
    "@types/jsonwebtoken": "^9.x"
  }
}
```

### 🚀 Próximos Passos Sugeridos

- [ ] Adicionar recuperação de senha
- [ ] Implementar sistema de amigos
- [ ] Adicionar chat no jogo
- [ ] Criar sistema de conquistas/badges
- [ ] Adicionar histórico de partidas
- [ ] Implementar rankings por período (semanal, mensal)
- [ ] Adicionar avatares personalizados
- [ ] Sistema de níveis e experiência
- [ ] Criar modo torneio
- [ ] Adicionar replays de partidas

### 📝 Notas de Migração

Para projetos existentes, siga os passos:

1. Instalar novas dependências: `npm install`
2. Configurar PostgreSQL (local ou Docker)
3. Executar schema: `psql -d football_db -f database/schema.sql`
4. Configurar variáveis de ambiente (`.env`)
5. Recompilar: `npm run build`
6. Iniciar servidor: `npm start`

### 🐛 Correções de Bugs

Nenhuma correção de bug nesta versão (nova funcionalidade).

### ⚠️ Breaking Changes

- Agora é necessário PostgreSQL para rodar o projeto
- Requer configuração de variáveis de ambiente
- Usuários não autenticados são redirecionados para `/auth.html`
- Socket.IO agora requer `userId` e `username` na query string

### 🙏 Créditos

Sistema desenvolvido para adicionar persistência e competitividade ao jogo Multiplayer Soccer.

---

## [1.0.0] - Data Anterior

### Funcionalidades Originais
- Jogo de futebol multiplayer em tempo real
- Sistema de salas
- Balanceamento de times
- Física básica (colisões, movimento)
- Placar e cronômetro
- WebSocket com Socket.IO
