# AI Cost Analysis — CollabBoard

**Project:** CollabBoard  
**Model:** OpenAI GPT-4o-mini (Board Agent + Smart Cluster)  
**Document:** AI-First Development Requirements — AI Cost Analysis

---

## 1. Development & Testing Costs

Track and report **actual** spend during development. Fill the values below from your provider dashboards.

### Where to get the numbers

1. **OpenAI:** Go to [Usage — OpenAI Platform](https://platform.openai.com/usage).  
2. Select the **date range** that covers your full development and testing period (e.g. project start through last test).  
3. Copy the totals for that period into the table below (and optionally break down by product/API if you use more than one).

### 1.1 LLM API costs

| Item | Value | Where to get it |
|------|--------|------------------|
| **Total cost (development period)** | **$0.14** | OpenAI Usage → Total cost for chosen date range |
| **Provider** | OpenAI | — |
| **Model(s)** | gpt-4o-mini | — |

### 1.2 Total tokens (input / output breakdown)

| Token type | Count | Where to get it |
|------------|--------|------------------|
| **Total input (prompt) tokens** | **1,063,000** (1.063M) | OpenAI Usage → “Prompt tokens” for chosen date range |
| **Total output (completion) tokens** | **40,328** | OpenAI Usage → “Completion tokens” for chosen date range |
| **Total tokens** | **1,062,667** | OpenAI Usage → Total tokens for chosen date range |

### 1.3 Number of API calls

| Item | Count | Where to get it |
|------|--------|------------------|
| **Total requests (API calls)** | **414** | OpenAI Usage → “Requests” or “API calls” for chosen date range |

### 1.4 Other AI-related costs

| Item | Cost / notes | Where to get it |
|------|------------------|------------------|
| **Embeddings** | None (0 requests) | OpenAI Usage |
| **Hosting (AI-specific)** | None | — |
| **Other** | None | Images, Web Searches, File Searches, Moderation all 0 |

**Development period:** **2026-02-06 – 2026-02-21**

---

## 2. Production Cost Projections

Estimate **monthly** cost at different user scales. Use the assumptions below (and your own numbers where indicated) to fill the table.

### 2.1 Assumptions

**Where to get or choose these:**

- **Average AI commands per user per session** — How many CollabBot messages (Board Agent requests) does a user send in one session?  
  - *Suggested:* 3–10 (e.g. “add 3 sticky notes,” “create flowchart,” “clear board”).  
  - **Your value:** **10** commands/session (upper bound of 3–10).
- **Average sessions per user per month** — How many times per month does an active user open the board and use CollabBot?  
  - *Suggested:* 4–8.  
  - **Your value:** **8** sessions/user/month (upper bound of 4–8).
- **Token counts per command type** — Board Agent: one request can be multi-step (up to 5 steps). Use averages per **single user message** (one “command”):
  - **Input tokens per Board Agent request:** ~5,000–15,000 (system prompt + board state + history). **Use:** **15,000** input tokens/request (upper bound).
  - **Output tokens per Board Agent request:** ~300–1,000 (reply + tool calls). **Use:** **1,000** output tokens/request (upper bound).
- **Smart Cluster:** One `generateText` per “Cluster” action; input &lt;1k, output &lt;500 tokens. Often negligible; include only if you expect heavy clustering. **Use:** **2** requests/user/month (upper bound of 0–2).

**Pricing (OpenAI gpt-4o-mini, check [OpenAI Pricing](https://platform.openai.com/docs/pricing) for current rates):**

- Input: **$0.15** per 1M tokens  
- Output: **$0.60** per 1M tokens  

**Formula for Board Agent only (monthly):**

- Commands per month = **active users × sessions/user/month × commands/session**
- Cost/month ≈ commands/month × (input_tokens × 0.15/1e6 + output_tokens × 0.60/1e6)

Example (10,000 input, 500 output per request):  
- Per command ≈ $0.0015 + $0.0003 = **$0.0018**  
- 100 users, 6 sessions, 5 commands → 3,000 commands/month → **~$5.40/month**

### 2.2 Monthly cost by user scale

| User scale | Commands/month | Board Agent $/month | Smart Cluster $/month | **Total $/month** |
|------------|--------------------------|--------------------------------|------------------------|-------------------|
| **100 users**   | 8,000  | $22.80   | $0.09 | **$22.89** |
| **1,000 users** | 80,000 | $228.00  | $0.90 | **$228.90** |
| **10,000 users** | 800,000 | $2,280.00 | $9.00 | **$2,289.00** |
| **100,000 users** | 8,000,000 | $22,800.00 | $90.00 | **$22,890.00** |

*Table uses upper-bound assumptions: 10 commands/session, 8 sessions/user/month, 15k input + 1k output tokens/request (Board Agent), 2 Smart Cluster requests/user/month. Cost per Board Agent command ≈ $0.00285; per Smart Cluster request ≈ $0.00045.*

Fill the table using your **assumptions** (commands/session, sessions/user/month, tokens/request) and the formula above. Replace the example rows with your own numbers so the document reflects your projections.

---

## 3. Reference: Where AI is used in the app

| Feature | API / code path | Notes |
|--------|------------------|-------|
| **CollabBot (Board Agent)** | `POST /api/ai/board-agent` (`streamText`) | One request per user message; up to 5 tool-call steps; system prompt + board state (max 80 elements) + history. |
| **Smart Cluster** | Server action `clusterNotesIntoThemes` (`generateText`) | One request per “Cluster” action; returns 3–4 themes as JSON. |

*Update this document when pricing or usage patterns change, and replace all placeholders with your actual data.*
