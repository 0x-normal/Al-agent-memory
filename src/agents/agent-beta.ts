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
