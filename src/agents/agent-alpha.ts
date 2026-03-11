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
