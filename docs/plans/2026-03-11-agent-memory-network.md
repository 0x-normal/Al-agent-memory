# Agent Memory Network Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a decentralized AI agent memory layer using Shelby Protocol for blob storage on Aptos testnet, enabling cross-agent knowledge sharing.

**Architecture:** Each memory is stored as a JSON blob on Shelby at `memories/{agentId}/{memoryId}.json`, with an index at `memories/{agentId}/index.json`. Three demo agents (Alpha, Beta, Gamma) use a shared `MemoryManager` class to store, retrieve, share, and search memories across agents.

**Tech Stack:** Node.js, TypeScript, `@shelby-protocol/sdk`, `@aptos-labs/ts-sdk`, `uuid`, `dotenv`, `ts-node`

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `src/` directory structure

**Step 1: Initialize npm project**

```bash
cd /c/Users/isanoxel/Desktop/shelby
npm init -y
```

Expected: `package.json` created.

**Step 2: Install dependencies**

```bash
npm install @shelby-protocol/sdk @aptos-labs/ts-sdk uuid dotenv
npm install -D typescript ts-node @types/node @types/uuid
```

Expected: `node_modules/` created, `package.json` updated with deps.

**Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Update `package.json` scripts**

Add to the `"scripts"` section:
```json
"scripts": {
  "dev": "ts-node src/demo.ts",
  "cli": "ts-node src/cli.ts",
  "build": "tsc"
}
```

**Step 5: Write `.env.example`**

```
SHELBY_API_KEY=aptoslabs_your_api_key_here
APTOS_PRIVATE_KEY=ed25519-priv-your_private_key_here
AGENT_ALPHA_ID=agent-alpha
AGENT_BETA_ID=agent-beta
AGENT_GAMMA_ID=agent-gamma
```

**Step 6: Write `.gitignore`**

```
node_modules/
dist/
.env
*.js.map
```

**Step 7: Create source directories**

```bash
mkdir -p src/agents
```

**Step 8: Commit**

```bash
git init
git add package.json tsconfig.json .env.example .gitignore
git commit -m "chore: scaffold project with deps and config"
```

---

### Task 2: Shelby Client (`src/shelby.ts`)

**Files:**
- Create: `src/shelby.ts`

**Context:** The Shelby SDK exposes `ShelbyNodeClient` (or similar). We initialize it with `Network.TESTNET` and an API key. We also init an `Ed25519Account` from a hex private key via `@aptos-labs/ts-sdk`.

**Step 1: Write `src/shelby.ts`**

```typescript
import { ShelbyNodeClient } from '@shelby-protocol/sdk';
import { Ed25519Account, Ed25519PrivateKey, Network } from '@aptos-labs/ts-sdk';
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.SHELBY_API_KEY;
const privateKeyHex = process.env.APTOS_PRIVATE_KEY;

if (!apiKey) throw new Error('Missing SHELBY_API_KEY in .env');
if (!privateKeyHex) throw new Error('Missing APTOS_PRIVATE_KEY in .env');

export const shelbyClient = new ShelbyNodeClient({
  network: Network.TESTNET,
  apiKey,
  nodeUrl: 'https://api.testnet.shelby.xyz',
});

const privateKey = new Ed25519PrivateKey(privateKeyHex);
export const account = new Ed25519Account({ privateKey });
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors (or only "cannot find module" if SDK types differ — adjust imports accordingly after checking SDK docs).

**Step 3: Commit**

```bash
git add src/shelby.ts
git commit -m "feat: add Shelby client factory"
```

---

### Task 3: Memory Type Definition (`src/types.ts`)

**Files:**
- Create: `src/types.ts`

**Step 1: Write `src/types.ts`**

```typescript
export type MemoryType = 'experience' | 'knowledge' | 'observation';

export interface Memory {
  id: string;
  agentId: string;
  type: MemoryType;
  content: string;
  tags: string[];
  timestamp: number;
  embedding: null;
}

export interface MemoryIndex {
  memoryIds: string[];
}
```

**Step 2: Verify compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add Memory type definitions"
```

---

### Task 4: MemoryManager — storeMemory (`src/memory.ts`)

**Files:**
- Create: `src/memory.ts`

**Context:** `shelbyClient.uploadBlob(account, blobName, data, options)` uploads a blob. Check SDK for exact method signatures. `expirationMicros` should be `Date.now() * 1000 + 30 * 24 * 60 * 60 * 1_000_000` (30 days from now in microseconds).

**Step 1: Write `src/memory.ts` with storeMemory**

```typescript
import { v4 as uuidv4 } from 'uuid';
import { shelbyClient, account } from './shelby';
import { Memory, MemoryType } from './types';

const THIRTY_DAYS_MICROS = 30n * 24n * 60n * 60n * 1_000_000n;

function nowMicros(): bigint {
  return BigInt(Date.now()) * 1000n;
}

function blobName(agentId: string, filename: string): string {
  return `memories/${agentId}/${filename}`;
}

async function uploadJson(name: string, data: unknown): Promise<void> {
  const bytes = Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
  const expirationMicros = nowMicros() + THIRTY_DAYS_MICROS;
  try {
    await shelbyClient.uploadBlob(account, name, bytes, { expirationMicros });
    console.log(`[Shelby] Uploaded: ${name}`);
  } catch (err) {
    throw new Error(`Failed to upload blob "${name}": ${(err as Error).message}`);
  }
}

async function downloadJson<T>(ownerAddress: string, name: string): Promise<T | null> {
  try {
    const data = await shelbyClient.downloadBlob(ownerAddress, name);
    return JSON.parse(Buffer.from(data).toString('utf-8')) as T;
  } catch {
    return null;
  }
}

export class MemoryManager {
  async storeMemory(
    agentId: string,
    type: MemoryType,
    content: string,
    tags: string[] = []
  ): Promise<string> {
    const memoryId = uuidv4();
    const memory: Memory = {
      id: memoryId,
      agentId,
      type,
      content,
      tags,
      timestamp: Date.now(),
      embedding: null,
    };

    // Upload memory blob
    await uploadJson(blobName(agentId, `${memoryId}.json`), memory);

    // Update index
    const indexName = blobName(agentId, 'index.json');
    const ownerAddress = account.accountAddress.toString();
    const existing = await downloadJson<{ memoryIds: string[] }>(ownerAddress, indexName);
    const memoryIds = existing?.memoryIds ?? [];
    memoryIds.push(memoryId);
    await uploadJson(indexName, { memoryIds });

    return memoryId;
  }
}
```

**Step 2: Verify compile**

```bash
npx tsc --noEmit
```

Expected: No errors. Adjust method names if SDK differs from expected.

**Step 3: Commit**

```bash
git add src/memory.ts
git commit -m "feat: add MemoryManager.storeMemory"
```

---

### Task 5: MemoryManager — retrieve, list, search, share

**Files:**
- Modify: `src/memory.ts`

**Step 1: Add remaining methods to `MemoryManager` class**

Append to the class (after `storeMemory`):

```typescript
  async retrieveMemory(
    ownerAddress: string,
    agentId: string,
    memoryId: string
  ): Promise<Memory | null> {
    const name = blobName(agentId, `${memoryId}.json`);
    return downloadJson<Memory>(ownerAddress, name);
  }

  async listAgentMemories(ownerAddress: string, agentId: string): Promise<Memory[]> {
    const indexName = blobName(agentId, 'index.json');
    const index = await downloadJson<{ memoryIds: string[] }>(ownerAddress, indexName);
    if (!index) return [];

    const memories = await Promise.all(
      index.memoryIds.map((id) => this.retrieveMemory(ownerAddress, agentId, id))
    );
    return memories.filter((m): m is Memory => m !== null);
  }

  async searchMemories(
    ownerAddress: string,
    agentId: string,
    keyword: string
  ): Promise<Memory[]> {
    const all = await this.listAgentMemories(ownerAddress, agentId);
    const lower = keyword.toLowerCase();
    return all.filter(
      (m) =>
        m.content.toLowerCase().includes(lower) ||
        m.tags.some((t) => t.toLowerCase().includes(lower))
    );
  }

  async shareMemory(
    fromAgentId: string,
    toAgentId: string,
    memoryId: string
  ): Promise<void> {
    const ownerAddress = account.accountAddress.toString();
    const original = await this.retrieveMemory(ownerAddress, fromAgentId, memoryId);
    if (!original) throw new Error(`Memory ${memoryId} not found for agent ${fromAgentId}`);

    const sharedName = blobName(toAgentId, `shared-${memoryId}.json`);
    await uploadJson(sharedName, original);

    // Update toAgentId index
    const indexName = blobName(toAgentId, 'index.json');
    const existing = await downloadJson<{ memoryIds: string[] }>(ownerAddress, indexName);
    const memoryIds = existing?.memoryIds ?? [];
    const sharedId = `shared-${memoryId}`;
    if (!memoryIds.includes(sharedId)) {
      memoryIds.push(sharedId);
      await uploadJson(indexName, { memoryIds });
    }
  }
```

**Step 2: Verify compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/memory.ts
git commit -m "feat: add MemoryManager retrieve, list, search, share"
```

---

### Task 6: Agent Alpha (`src/agents/agent-alpha.ts`)

**Files:**
- Create: `src/agents/agent-alpha.ts`

**Step 1: Write `src/agents/agent-alpha.ts`**

```typescript
import { MemoryManager } from '../memory';

export class AgentAlpha {
  readonly agentId: string;
  private manager: MemoryManager;

  constructor(agentId: string, manager: MemoryManager) {
    this.agentId = agentId;
    this.manager = manager;
  }

  async storeExploration(content: string, tags: string[] = []): Promise<string> {
    console.log(`[Alpha] Storing exploration: "${content.slice(0, 60)}..."`);
    return this.manager.storeMemory(this.agentId, 'experience', content, tags);
  }

  async shareWith(toAgentId: string, memoryId: string): Promise<void> {
    console.log(`[Alpha] Sharing memory ${memoryId} → ${toAgentId}`);
    await this.manager.shareMemory(this.agentId, toAgentId, memoryId);
  }
}
```

**Step 2: Commit**

```bash
git add src/agents/agent-alpha.ts
git commit -m "feat: add AgentAlpha"
```

---

### Task 7: Agent Beta (`src/agents/agent-beta.ts`)

**Files:**
- Create: `src/agents/agent-beta.ts`

**Step 1: Write `src/agents/agent-beta.ts`**

```typescript
import { MemoryManager } from '../memory';
import { Memory } from '../types';

export class AgentBeta {
  readonly agentId: string;
  private manager: MemoryManager;

  constructor(agentId: string, manager: MemoryManager) {
    this.agentId = agentId;
    this.manager = manager;
  }

  async storeAnalysis(content: string, tags: string[] = []): Promise<string> {
    console.log(`[Beta] Storing analysis: "${content.slice(0, 60)}..."`);
    return this.manager.storeMemory(this.agentId, 'knowledge', content, tags);
  }

  async retrieveFromAlpha(ownerAddress: string, alphaId: string): Promise<Memory[]> {
    console.log(`[Beta] Retrieving Alpha's memories for analysis...`);
    return this.manager.listAgentMemories(ownerAddress, alphaId);
  }
}
```

**Step 2: Commit**

```bash
git add src/agents/agent-beta.ts
git commit -m "feat: add AgentBeta"
```

---

### Task 8: Agent Gamma (`src/agents/agent-gamma.ts`)

**Files:**
- Create: `src/agents/agent-gamma.ts`

**Step 1: Write `src/agents/agent-gamma.ts`**

```typescript
import { MemoryManager } from '../memory';
import { Memory } from '../types';

export class AgentGamma {
  readonly agentId: string;
  private manager: MemoryManager;

  constructor(agentId: string, manager: MemoryManager) {
    this.agentId = agentId;
    this.manager = manager;
  }

  async aggregate(ownerAddress: string, agentIds: string[]): Promise<Memory[]> {
    console.log(`[Gamma] Aggregating memories from: ${agentIds.join(', ')}`);
    const all = await Promise.all(
      agentIds.map((id) => this.manager.listAgentMemories(ownerAddress, id))
    );
    return all.flat();
  }

  async storeSummary(content: string, tags: string[] = []): Promise<string> {
    console.log(`[Gamma] Storing observation summary...`);
    return this.manager.storeMemory(this.agentId, 'observation', content, tags);
  }
}
```

**Step 2: Commit**

```bash
git add src/agents/agent-gamma.ts
git commit -m "feat: add AgentGamma"
```

---

### Task 9: Demo Script (`src/demo.ts`)

**Files:**
- Create: `src/demo.ts`

**Step 1: Write `src/demo.ts`**

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

import { account } from './shelby';
import { MemoryManager } from './memory';
import { AgentAlpha } from './agents/agent-alpha';
import { AgentBeta } from './agents/agent-beta';
import { AgentGamma } from './agents/agent-gamma';

async function main() {
  const ownerAddress = account.accountAddress.toString();
  const manager = new MemoryManager();

  const alpha = new AgentAlpha(process.env.AGENT_ALPHA_ID!, manager);
  const beta = new AgentBeta(process.env.AGENT_BETA_ID!, manager);
  const gamma = new AgentGamma(process.env.AGENT_GAMMA_ID!, manager);

  console.log('\n=== STEP 1: Agent Alpha stores 3 experience memories ===');
  const a1 = await alpha.storeExploration(
    'Discovered an anomaly in the eastern data cluster — unusual spike in entropy readings.',
    ['anomaly', 'entropy', 'cluster']
  );
  const a2 = await alpha.storeExploration(
    'Mapped a previously uncharted region of the knowledge graph with 12 new nodes.',
    ['graph', 'mapping', 'discovery']
  );
  const a3 = await alpha.storeExploration(
    'Identified a recurring pattern in agent communication latency every 7 cycles.',
    ['latency', 'pattern', 'communication']
  );

  console.log('\n=== STEP 2: Agent Beta stores 2 knowledge memories ===');
  const b1 = await beta.storeAnalysis(
    'Analysis: entropy spikes correlate with increased inter-agent message volume.',
    ['entropy', 'analysis', 'correlation']
  );
  const b2 = await beta.storeAnalysis(
    'Knowledge synthesis: graph expansion rate follows a power law distribution.',
    ['graph', 'power-law', 'synthesis']
  );

  console.log('\n=== STEP 3: Agent Alpha shares one memory with Agent Beta ===');
  await alpha.shareWith(beta.agentId, a1);

  console.log('\n=== STEP 4: Agent Gamma retrieves ALL memories from Alpha AND Beta ===');
  const allMemories = await gamma.aggregate(ownerAddress, [alpha.agentId, beta.agentId]);
  console.log(`[Gamma] Retrieved ${allMemories.length} memories total`);
  allMemories.forEach((m) => {
    console.log(`  [${m.agentId}] (${m.type}) ${m.content.slice(0, 80)}...`);
  });

  console.log('\n=== STEP 5: Agent Gamma stores a summary observation ===');
  const summary = `Coordinated summary: Observed ${allMemories.length} memories across ${[alpha.agentId, beta.agentId].join(', ')}. Key themes: entropy anomalies, graph expansion, latency patterns. Cross-agent correlation confirmed between Alpha's discovery and Beta's analysis.`;
  const g1 = await gamma.storeSummary(summary, ['summary', 'coordination', 'cross-agent']);

  console.log('\n=== STEP 6: All stored blob URLs ===');
  const base = `https://api.testnet.shelby.xyz/shelby/v1/blobs/${ownerAddress}`;
  const blobs = [
    `memories/${alpha.agentId}/${a1}.json`,
    `memories/${alpha.agentId}/${a2}.json`,
    `memories/${alpha.agentId}/${a3}.json`,
    `memories/${alpha.agentId}/index.json`,
    `memories/${beta.agentId}/${b1}.json`,
    `memories/${beta.agentId}/${b2}.json`,
    `memories/${beta.agentId}/shared-${a1}.json`,
    `memories/${beta.agentId}/index.json`,
    `memories/${gamma.agentId}/${g1}.json`,
    `memories/${gamma.agentId}/index.json`,
  ];
  blobs.forEach((b) => console.log(`  ${base}/${b}`));

  console.log('\n✓ Demo complete!');
}

main().catch(console.error);
```

**Step 2: Verify compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/demo.ts
git commit -m "feat: add demo script"
```

---

### Task 10: CLI (`src/cli.ts`)

**Files:**
- Create: `src/cli.ts`

**Step 1: Write `src/cli.ts`**

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

import { account } from './shelby';
import { MemoryManager } from './memory';
import { MemoryType } from './types';

const manager = new MemoryManager();
const [, , command, ...args] = process.argv;

async function main() {
  switch (command) {
    case 'store': {
      const [agentId, type, content, ...tags] = args;
      if (!agentId || !type || !content) {
        console.error('Usage: store <agentId> <type> <content> [tags...]');
        process.exit(1);
      }
      const id = await manager.storeMemory(agentId, type as MemoryType, content, tags);
      console.log(`Stored memory: ${id}`);
      break;
    }
    case 'list': {
      const [ownerAddress, agentId] = args;
      if (!ownerAddress || !agentId) {
        console.error('Usage: list <ownerAddress> <agentId>');
        process.exit(1);
      }
      const memories = await manager.listAgentMemories(ownerAddress, agentId);
      if (memories.length === 0) {
        console.log('No memories found.');
      } else {
        memories.forEach((m) => console.log(`[${m.id}] (${m.type}) ${m.content.slice(0, 80)}`));
      }
      break;
    }
    case 'get': {
      const [ownerAddress, agentId, memoryId] = args;
      if (!ownerAddress || !agentId || !memoryId) {
        console.error('Usage: get <ownerAddress> <agentId> <memoryId>');
        process.exit(1);
      }
      const memory = await manager.retrieveMemory(ownerAddress, agentId, memoryId);
      if (!memory) {
        console.log('Memory not found.');
      } else {
        console.log(JSON.stringify(memory, null, 2));
      }
      break;
    }
    case 'search': {
      const [ownerAddress, agentId, keyword] = args;
      if (!ownerAddress || !agentId || !keyword) {
        console.error('Usage: search <ownerAddress> <agentId> <keyword>');
        process.exit(1);
      }
      const results = await manager.searchMemories(ownerAddress, agentId, keyword);
      if (results.length === 0) {
        console.log('No matches found.');
      } else {
        results.forEach((m) => console.log(`[${m.id}] (${m.type}) ${m.content.slice(0, 80)}`));
      }
      break;
    }
    case 'share': {
      const [fromAgentId, toAgentId, memoryId] = args;
      if (!fromAgentId || !toAgentId || !memoryId) {
        console.error('Usage: share <fromAgentId> <toAgentId> <memoryId>');
        process.exit(1);
      }
      await manager.shareMemory(fromAgentId, toAgentId, memoryId);
      console.log(`Shared memory ${memoryId} from ${fromAgentId} to ${toAgentId}`);
      break;
    }
    default:
      console.log(`
Usage: npm run cli -- <command> [args]

Commands:
  store <agentId> <type> <content> [tags...]
  list <ownerAddress> <agentId>
  get <ownerAddress> <agentId> <memoryId>
  search <ownerAddress> <agentId> <keyword>
  share <fromAgentId> <toAgentId> <memoryId>
      `);
  }
}

main().catch(console.error);
```

**Step 2: Verify compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add CLI interface"
```

---

### Task 11: README.md

**Files:**
- Create: `README.md`

**Step 1: Write `README.md`**

```markdown
# agent-memory-network

A decentralized AI agent memory layer using the **Shelby Protocol** for blob storage on Aptos testnet. Agents store memories (experiences, knowledge, observations) as JSON blobs on Shelby. Any agent can retrieve memories from any other agent, enabling cross-agent knowledge sharing.

## Architecture

```
Agent (Alpha/Beta/Gamma)
        │
        ▼
  MemoryManager
        │
        ▼
   Shelby SDK
        │
        ▼
 Shelby Testnet
        │
        ▼
  Aptos Blockchain
```

Each memory is stored at:
- `memories/{agentId}/{memoryId}.json` — individual memory blob
- `memories/{agentId}/index.json` — list of all memory IDs for that agent

## Setup

### 1. Prerequisites

- Node.js 18+
- An Aptos testnet account with APT (for gas)
- A Shelby API key with ShelbyUSD balance (for blob storage)

### 2. Get Testnet Tokens

- **APT (gas):** [Aptos Testnet Faucet](https://aptos.dev/network/faucet)
- **ShelbyUSD (storage):** Join [Shelby Discord](https://discord.gg/shelbyprotocol) and request testnet tokens

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials:
# SHELBY_API_KEY=aptoslabs_***
# APTOS_PRIVATE_KEY=ed25519-priv-***
# AGENT_ALPHA_ID=agent-alpha
# AGENT_BETA_ID=agent-beta
# AGENT_GAMMA_ID=agent-gamma
```

## Running the Demo

```bash
npm run dev
```

This runs a full simulation:
1. Agent Alpha stores 3 exploration memories
2. Agent Beta stores 2 analysis memories
3. Alpha shares a memory with Beta
4. Gamma aggregates all memories from Alpha + Beta
5. Gamma stores a coordination summary
6. Prints all blob URLs on Shelby testnet

## CLI Usage

```bash
# Store a memory
npm run cli -- store agent-alpha experience "Found new data pattern" discovery pattern

# List all memories for an agent
npm run cli -- list <ownerAddress> agent-alpha

# Retrieve a specific memory
npm run cli -- get <ownerAddress> agent-alpha <memoryId>

# Search memories by keyword
npm run cli -- search <ownerAddress> agent-alpha entropy

# Share a memory between agents
npm run cli -- share agent-alpha agent-beta <memoryId>
```

## Resources

- [Shelby Protocol Docs](https://docs.staging.shelby.xyz/protocol)
- [Aptos Testnet Faucet](https://aptos.dev/network/faucet)
- [Shelby Discord](https://discord.gg/shelbyprotocol)
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup and usage"
```

---

### Task 12: Final Build Verification

**Step 1: Run full TypeScript compile**

```bash
npm run build
```

Expected: `dist/` directory created with compiled JS. No errors.

**Step 2: Verify project structure**

```bash
find . -not -path './node_modules/*' -not -path './dist/*' -not -path './.git/*' | sort
```

Expected output:
```
.
./README.md
./.env.example
./.gitignore
./docs/plans/2026-03-11-agent-memory-network.md
./package.json
./tsconfig.json
./src/agents/agent-alpha.ts
./src/agents/agent-beta.ts
./src/agents/agent-gamma.ts
./src/cli.ts
./src/demo.ts
./src/memory.ts
./src/shelby.ts
./src/types.ts
```

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final build verification"
```

---

## Notes on SDK Integration

The `@shelby-protocol/sdk` API may differ slightly from what's in this plan. Key things to check:
1. **Constructor:** Exact options for `ShelbyNodeClient` (network, apiKey, nodeUrl)
2. **Upload method:** May be `uploadBlob`, `putBlob`, or `upload` — check SDK exports
3. **Download method:** May be `downloadBlob`, `getBlob`, or `download` — takes `(ownerAddress, blobName)`
4. **expirationMicros type:** May be `bigint` or `number`

If the SDK shape differs, look for the actual exports:
```bash
cat node_modules/@shelby-protocol/sdk/dist/index.d.ts | head -50
```

Adjust `src/shelby.ts` and `src/memory.ts` accordingly.
