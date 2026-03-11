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
