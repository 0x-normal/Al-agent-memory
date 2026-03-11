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
