# 📊 Relatório de Teste de Carga - Artillery

## 🚀 Como Executar os Testes

### Instalação do Artillery

```bash
# Instalação global
npm install -g artillery

# Ou via npx (sem instalação)
npx artillery
```

### Comandos de Execução

```bash
# Navegar para o diretório de testes
cd load-tests

# Executar teste de carga LEVE
artillery run http-light-load.yml

# Executar teste de carga MÉDIA
artillery run http-medium-load.yml

# Executar teste de carga PESADA
artillery run http-heavy-load.yml

# Gerar relatório HTML
artillery run http-medium-load.yml --output report.json
artillery report report.json --output report.json.html
```

---

## 📋 Níveis de Carga Disponíveis

### 🟢 Carga Leve (`http-light-load.yml`)

| Fase | Duração | Taxa de Chegada | Descrição |
|------|---------|-----------------|-----------|
| Aquecimento | 30s | 10 req/s | Preparação inicial |
| Carga constante | 60s | 20 req/s | Teste básico |
| Desaceleração | 30s | 10 req/s | Finalização |

**Total:** ~120 segundos | ~1.800 usuários virtuais

---

### 🟡 Carga Média (`http-medium-load.yml`) ⬅️ **USADO NESTE TESTE**

| Fase | Duração | Taxa de Chegada | Descrição |
|------|---------|-----------------|-----------|
| Aquecimento | 30s | 20 req/s | Preparação |
| Ramp-up | 60s | 20→50 req/s | Aumento gradual |
| Carga sustentada | 120s | 50 req/s | Teste principal |
| Desaceleração | 30s | 30 req/s | Finalização |

**Total:** ~240 segundos | ~9.600 usuários virtuais

---

### 🔴 Carga Pesada (`http-heavy-load.yml`)

| Fase | Duração | Taxa de Chegada | Descrição |
|------|---------|-----------------|-----------|
| Aquecimento | 20s | 30 req/s | Preparação rápida |
| Ramp-up agressivo | 40s | 30→100 req/s | Aumento agressivo |
| Carga pesada | 90s | 100 req/s | Stress test |
| Pico de carga | 30s | 100→150 req/s | Teste de limite |
| Desaceleração | 20s | 50 req/s | Finalização |

**Total:** ~200 segundos | ~15.000+ usuários virtuais

---

## 🎯 Cenários Testados

| Cenário | Peso | Endpoint | Método |
|---------|------|----------|--------|
| Registro de Usuário | 25% | `/api/auth/register` | POST |
| Login de Usuário | 40% | `/api/auth/login` | POST |
| Consultar Ranking | 20% | `/api/auth/ranking` | GET |
| Login e Ranking | 15% | `/api/auth/login` + `/api/auth/ranking` | POST + GET |

---

# 📈 Análise do Relatório de Teste de Carga (Artillery)

## 📊 Resumo Geral

| Métrica | Valor |
|---------|-------|
| **Usuários Virtuais Criados** | 9.600 |
| **Usuários Completados** | 1.864 (19,4%) |
| **Usuários Falhados** | 7.736 (80,6%) |
| **Requisições HTTP** | 9.600 |
| **Respostas Recebidas** | 4.047 (42,2%) |
| **Taxa de Requisição** | ~39 req/s |
| **Duração Total** | ~4 minutos |

---

## 🔴 Erros Identificados

| Tipo de Erro | Quantidade | Descrição |
|--------------|------------|-----------|
| **ETIMEDOUT** | 5.553 | Timeout de conexão - servidor não respondeu a tempo |
| **Failed capture or match** | 2.183 | Falha na captura de token (login retornou 401) |

### Distribuição de ETIMEDOUT por Endpoint

```
/api/auth/login    ████████████████████████████████  3.090 (55,6%)
/api/auth/register █████████████████                 1.404 (25,3%)
/api/auth/ranking  ████████████                      1.059 (19,1%)
```

---

## 📈 Códigos HTTP Retornados

| Código | Quantidade | Percentual | Significado |
|--------|------------|------------|-------------|
| **200** | 847 | 20,9% | Sucesso (ranking) |
| **201** | 1.017 | 25,1% | Criado (registro) |
| **401** | 2.183 | 53,9% | Não autorizado (login falhou) |

### Visualização

```
Sucesso (2xx):  ████████████████████████████████████████  1.864 (46%)
Erro (4xx):     ██████████████████████████████████████    2.183 (54%)
```

---

## ⏱️ Tempos de Resposta (ms)

### Tabela Comparativa por Endpoint

| Percentil | Geral | Ranking | Register | Login |
|-----------|-------|---------|----------|-------|
| **Mínimo** | 1 | 2 | 70 | 1 |
| **Média** | 3.289 | 3.343 | 3.302 | 3.262 |
| **Mediana (p50)** | 2.101 | 2.144 | 2.060 | 2.187 |
| **p75** | 5.168 | 5.827 | 4.965 | 5.168 |
| **p90** | 9.048 | 9.048 | 9.048 | 9.048 |
| **p95** | 9.801 | 9.801 | 9.999 | 9.801 |
| **p99** | 10.201 | 10.201 | 10.407 | 10.201 |
| **Máximo** | 10.762 | 10.393 | 10.762 | 10.424 |

### Interpretação dos Percentis

- **p50 (Mediana):** 50% das requisições foram atendidas em até ~2.1s
- **p95:** 95% das requisições foram atendidas em até ~9.8s
- **p99:** 99% das requisições foram atendidas em até ~10.2s

> ⚠️ **Alerta:** Para aplicações de jogos em tempo real, tempos acima de 100ms são considerados problemáticos.

---

## 🎯 Distribuição de Cenários

| Cenário | Usuários Criados | Percentual |
|---------|------------------|------------|
| Login de Usuário | 3.804 | 39,6% |
| Registro de Usuário | 2.421 | 25,2% |
| Consultar Ranking | 1.906 | 19,9% |
| Login e Ranking | 1.469 | 15,3% |

---

## 🚨 Diagnóstico de Problemas

### 1. Taxa de Falha Crítica (80,6%)

```
Completados: █████████████                           1.864 (19,4%)
Falhados:    ████████████████████████████████████████ 7.736 (80,6%)
```

**Causa provável:** Servidor incapaz de processar a carga de 50 req/s sustentada.

### 2. Timeouts Excessivos (ETIMEDOUT)

O erro `ETIMEDOUT` ocorre quando o servidor não responde dentro do tempo limite configurado (default: 10s).

**Possíveis causas:**
- Pool de conexões do banco esgotado
- CPU/memória insuficientes
- Falta de workers/threads
- Bloqueio de I/O síncrono

### 3. Alta Latência

```
Ideal para games:     █ <100ms
Aceitável:            ██ <500ms
Atual (mediana):      ██████████████████████████████ 2.100ms ❌
```

### 4. Erros de Autenticação (401)

2.183 requisições de login retornaram 401. Isso indica:
- Usuários de teste não existem no banco
- Credenciais inválidas nos cenários
- Problema na lógica de autenticação

---

## 💡 Recomendações de Otimização

### Prioridade Alta 🔴

1. **Escalar horizontalmente** - Adicionar mais instâncias do servidor
2. **Aumentar pool de conexões PostgreSQL** - Verificar `max_connections`
3. **Implementar cache Redis para ranking** - Já existe `redisClient.ts` no projeto
4. **Otimizar queries do banco** - Adicionar índices apropriados

### Prioridade Média 🟡

5. **Rate limiting** - Proteger contra sobrecarga
6. **Connection pooling** - Usar PgBouncer ou similar
7. **Compressão gzip** - Reduzir tamanho das respostas

### Prioridade Baixa 🟢

8. **CDN para assets estáticos**
9. **Monitoramento APM** - New Relic, Datadog
10. **Auto-scaling** - Kubernetes HPA

---

## 📁 Arquivos de Configuração

```
load-tests/
├── http-light-load.yml    # Carga leve (~1.800 VUs)
├── http-medium-load.yml   # Carga média (~9.600 VUs) ⬅️ USADO
├── http-heavy-load.yml    # Carga pesada (~15.000 VUs)
├── stress-test.yml        # Teste de stress
├── websocket-test.yml     # Teste WebSocket
└── functions.js           # Funções auxiliares
```

---

## 📅 Metadados do Teste

| Campo | Valor |
|-------|-------|
| **Data do Teste** | 26/01/2026 |
| **Ferramenta** | Artillery |
| **Nível de Carga** | Média |
| **Target** | `http://localhost` |
| **Duração Total** | ~4 minutos (246s) |

---

## 🔗 Referências

- [Documentação Artillery](https://www.artillery.io/docs)
- [Best Practices for Load Testing](https://www.artillery.io/docs/guides/guides/performance-testing-best-practices)
- [Métricas e Percentis](https://www.artillery.io/docs/guides/getting-started/running-tests#understanding-the-output)
