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
