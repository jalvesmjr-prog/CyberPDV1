# Degradação e Alucinação em LLMs — Guia Prático

Fontes: Nature (2024), ECIR (2026), AAAI (2026), TACL (2024), Chroma Research (2025),
Anthropic, OpenAI, Microsoft Research, Boris Cherny, Engram, SWE-TRACE, Tokalator, e mais.

---

## 1. Mecanismos Provados de Degradação

### 1.1 Lost in the Middle (TACL 2024, confirmado 2025-2026)
**Curva em U:** Performance é máxima no início e fim do contexto, e **cai 30%+ no meio**.

Matematicamente provado (2026): é uma consequência inevitável da arquitetura Transformer —
`O(1/(H-1)!)` zona morta geométrica no meio do contexto. **Não tem cura com mais fine-tuning.**
É um problema topológico, não de treinamento.

### 1.2 Context Rot (Chroma 2025)
- **18/18 modelos frontier testados** — TODOS degradam com entradas longas
- Degradação de 20-50% de 10K a 100K tokens
- Claude decai mais lentamente, mas **nenhum está imune**

### 1.3 Critical Threshold (2026)
**Performance não degrada gradualmente — ela DESPENCA.**
- Qwen2.5-7B: F1 = 0.55 → **0.3 (45.5% de queda) entre 40-50% da janela**
- É uma função degrau: 0.9 no limite, 0.6 alguns tokens depois

### 1.4 Right-Edge Drop (Veseli et al. 2025)
- Acima de 50% de utilização, a curva em U se deforma
- Acima de 80%, só resta recency bias (e com performance absoluta menor)
- O "último pedaço" da janela anunciada **não funciona**

### 1.5 MECW — Maximum Effective Context Window
| Modelo | Anunciado | Efetivo (produção) | % Útil |
|--------|-----------|-------------------|--------|
| Médio | 200K | ~32-64K | ~25% |
| Frontier | 1M | ~200-300K | ~25% |
| Pior caso (tarefas complexas) | — | Até 99% menor | ~1% |

---

## 2. Métricas Matemáticas para Detectar Degradação

### 2.1 Acessíveis ao Usuário (você pode usar)

| Métrica | Como Medir | Alerta |
|---------|-----------|--------|
| **Lost-in-Middle Ratio** | score posição média ÷ score bordas | < 0.85 = falha |
| **Utilização de contexto** | tokens usados ÷ janela máxima | > 40-50% = risco |
| **Idade da sessão** | turns / compactações | > 2 compactações = limpeza |
| **Acertos seguidos** | tarefas completas sem retrabalho | 3+ erros = session stale |
| **Taxa de retrabalho** | prompts corretivos ÷ prompts totais | > 30% = /clear |

### 2.2 Internas (API retorna, mas poucos usam)

| Métrica | Origem | O que detecta |
|---------|--------|---------------|
| **Entropia Semântica** | Nature 2024 (Farquhar) | Confabulações (AUROC 0.95+) |
| **Entropy Production Rate (EPR)** | ECIR 2026 | Picos de entropia por token |
| **Semantic Energy** | 2025 (pós-softmax → logits) | Incerteza inerente do modelo |
| **Spilled Energy** | 2026 (EBM decomposition) | Discrepância entre energias |
| **Attention Sink Score** | 2026 | Atenção desproporcional a tokens não-informativos |
| **LOS (LLM Output Signature)** | AAAI 2026 | Distribuição completa de next-token |

> **Na prática:** Você não tem acesso a essas métricas internas como usuário. Mas pode inferir
> degradação pelo comportamento observável (seção 2.1).

---

## 3. Regras de Ouro para Evitar Degradação

### Regra 1: Lei dos 40%
**Nunca ultrapasse 40-50% da janela de contexto máxima.**
- 200K → ~80K tokens máximos
- 128K → ~50K tokens máximos
- 32K → ~13K tokens máximos

Além disso, você entra no **regime de degrau** — a performance cai abruptamente.

### Regra 2: Sandwich de Informação
```
INÍCIO (primacy bias — MAIS FORTE)
├── Instrução mais crítica
├── Contexto essencial
├── Regras não-negociáveis
│
MEIO (zona morta — performance cai 30%+)
├── Informação de suporte
├── Detalhes opcionais
├── Documentação extensa
│
FIM (recency bias — FORTE)
├── Pergunta/objetivo exato
├── Formato de saída esperado
└── "Question: [pergunta]" — ancora o modelo
```

### Regra 3: Sessões de 30-45 Minutos
- Uma tarefa por sessão
- 2h de sessão = 2-3 compactações = perda composta de informação
- Prazo de validade: ~40 turns ou 2 compactações, o que vier primeiro
- `/clear` é gratis — tokens não cruzam sessões

### Regra 4: Compressão Antes de Contexto
```
❌ Derrubar 100 páginas de doc no prompt
✅ chunk → resumir → só os resumos vão pro prompt
   (originais a um fetch de distância se precisar)
```

**LongLLMLingua (Microsoft):** compressão 4x → +21.4 pontos percentuais de acurácia.

### Regra 5: Ciclo Research → Plan → Implement
```
Fase 1: Research (modelo barato) — explore, encontre arquivos, mapete
             ↓
Fase 2: Plan (modelo caro) — spec preciso, arquitetura
             ↓
Fase 3: Implement (modelo médio) — código contra o spec
```

**Cada fase = janela de contexto fresca.** O spec é o artefato que cruza as fronteiras.
Não existe "arrastar contexto" — informação viaja via **documento escrito**, não via sessão.

---

## 4. Boas Práticas para Pico de Performance

### 4.1 Model Routing (Divisão Inteligente de Modelos)

| Tipo de Tarefa | Modelo | Custo Relativo | Motivo |
|----------------|--------|---------------|--------|
| Debugging complexo | Opus/GPT-5 | 24x | Raciocínio profundo |
| Arquitetura multi-file | Opus | 24x | Visão sistêmica |
| Feature implementation | Sonnet/GPT-4 | 6x | Equilíbrio custo-qualidade |
| Testes simples | Haiku/mini | 1x | Repetitivo, barato |
| Busca/documentação | Haiku/mini | 1x | Só leitura |
| Refatoração pequena | Haiku/mini | 1x | Escopo limitado |

**Economia:** 50-70% vs rodar tudo no modelo top.

### 4.2 Dynamic Turn Control (SWE-TRACE 2026)

Estudo em SWE-bench com Claude 4 Sonnet, Gemini 2.5 Pro, GPT 4.1:

| Estratégia | Custo vs Baseline | Solve Rate |
|-----------|------------------|------------|
| Ilimitado | 100% | 100% (referência) |
| **Fixed 75th percentile** | **24-68% MENOS** | **Quase igual** |
| **Dynamic (start low, extend on-demand)** | **12-24% MENOS que fixed** | **Igual ou melhor** |

**Regra:** Comece conservador. Se o agente pedir mais, concede. Isso economiza
sem perder qualidade.

### 4.3 Targeted Reads (10-50× mais barato)

```
❌ "Leia routes/vendas.js e entenda"
✅ "Leia routes/vendas.js:15-45 (validação estoque) e :80-120 (transação SQL)"
```

Cada token que você NÃO coloca no contexto é um token que o modelo pode usar
para RACIOCINAR melhor.

### 4.4 Uma Tarefa Por Sessão

| Cenário | Qualidade | Tokens |
|---------|-----------|--------|
| "Implemente login + carrinho + relatório" | Baixa (erros compostos) | Muitos |
| "Implemente login. Depois /clear. Carrinho. Depois /clear. Relatório." | Alta | **Menos** |

### 4.5 Deterministic Guardrails (Testes + Linters)

**O segredo mais importante:** Testes resetam o compound error rate.

```
Sessão sem guardrails:
  erro → erro → erro composto → alucinação → tudo errado → REWRITE

Sessão com guardrails:
  erro → TESTE FALHA → correção → TUDO OK → continue
```

- Testes = definição executável de "pronto"
- SWE-bench: agentes performam MELHOR com critérios de verificação upfront
- O modelo fica 2-3× melhor quando pode verificar o próprio trabalho

---

## 5. Sinais de Alarme (Quando Suspeitar)

### Degradação de Contexto
- [ ] O agente repete instruções que já recebeu
- [ ] "Esquece" regras que estavam no início da sessão
- [ ] Começa a sugerir soluções que já foram rejeitadas
- [ ] Fica mais prolixo (mais tokens para mesma resposta)
- [ ] Ignora constraints explicitas

### Ação Imediata
1. Execute `/compact` (se < 85% de uso) ou `/clear` (se > 85%)
2. Verifique o `/context` para audit do que está ocupando espaço
3. Considere dividir a tarefa em sessões menores
4. Salve o progresso em spec/arquivo antes de limpar

---

## 6. Métricas para seu Projeto

Aqui está como aplicar no CyberPDV:

| Métrica | Limiar | Como Medir | Ação |
|---------|--------|-----------|------|
| Tokens/sessão | < 40% da janela | `/context` | /compact se > 40% |
| Retrabalho | < 30% | Conte prompts corretivos | /clear se > 30% |
| Erros consecutivos | 0-1 | Teste servidor | Revise spec se > 1 |
| Duração sessão | < 45 min | Relógio | /clear ou finalize |
| Arquivos lidos | < 5-8 | Conte reads | Targeted reads |
| Compatações | < 2 | Conte /compact | /clear se = 3 |

---

## Referências

1. Farquhar et al. (2024). "Detecting hallucinations in large language models using semantic entropy." *Nature*, 630, 625-630.
2. Liu et al. (2024). "Lost in the Middle: How Language Models Use Long Contexts." *TACL*.
3. Chroma Research (2025). "Context Rot: Measuring Long-Context Degradation in Frontier Models."
4. Quevedo et al. (2026). "Learned Hallucination Detection using Token-Level Entropy Production Rate." *ECIR 2026*.
5. Bar-Shalom et al. (2026). "Beyond Next Token Probabilities: Learnable, Fast Detection of Hallucinations." *AAAI 2026*.
6. Veseli et al. (2025). "Positional Biases Shift as Inputs Approach Context Window Limits."
7. Kossen et al. (2024). "Semantic Entropy Probes: Robust and Cheap Hallucination Detection."
8. Du et al. (2025). "Context length alone degrades performance, independent of retrieval quality." *EMNLP*.
9. Microsoft Research. "LongLLMLingua: Prompt Compression Improves Accuracy."
10. Engram (2026). "Agentic Researcher Architecture with Research Digest handoff."
11. SWE-TRACE (2026). "Rubric Process Reward Models and Heuristic Test-Time Scaling."
12. Tokalator (2026). "Context-Engineering Toolkit for AI-Assisted Development."
13. Cursor Composer 2 (2026). "Technical Report on Agentic RL Training."
