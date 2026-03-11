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
