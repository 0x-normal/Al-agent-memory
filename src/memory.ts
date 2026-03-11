import { v4 as uuidv4 } from 'uuid';
import { shelbyClient, account } from './shelby';
import { Memory, MemoryType } from './types';

const THIRTY_DAYS_MICROS = 30 * 24 * 60 * 60 * 1_000_000;

function nowMicros(): number {
  return Date.now() * 1000;
}

function blobName(agentId: string, filename: string): string {
  return `memories/${agentId}/${filename}`;
}

async function readStream(readable: ReadableStream): Promise<Uint8Array> {
  const reader = readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value as Uint8Array);
  }
  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function uploadJson(name: string, data: unknown): Promise<void> {
  const blobData = Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
  const expirationMicros = nowMicros() + THIRTY_DAYS_MICROS;
  try {
    await shelbyClient.upload({ blobData, signer: account, blobName: name, expirationMicros });
    console.log(`[Shelby] Uploaded: ${name}`);
  } catch (err) {
    throw new Error(`Failed to upload blob "${name}": ${(err as Error).message}`);
  }
}

async function downloadJson<T>(ownerAddress: string, name: string): Promise<T | null> {
  try {
    const blob = await shelbyClient.download({ account: ownerAddress, blobName: name });
    const bytes = await readStream(blob.readable);
    return JSON.parse(Buffer.from(bytes).toString('utf-8')) as T;
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

    await uploadJson(blobName(agentId, `${memoryId}.json`), memory);

    const indexName = blobName(agentId, 'index.json');
    const ownerAddress = account.accountAddress.toString();
    const existing = await downloadJson<{ memoryIds: string[] }>(ownerAddress, indexName);
    const memoryIds = existing?.memoryIds ?? [];
    memoryIds.push(memoryId);
    await uploadJson(indexName, { memoryIds });

    return memoryId;
  }

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

    const indexName = blobName(toAgentId, 'index.json');
    const existing = await downloadJson<{ memoryIds: string[] }>(ownerAddress, indexName);
    const memoryIds = existing?.memoryIds ?? [];
    const sharedId = `shared-${memoryId}`;
    if (!memoryIds.includes(sharedId)) {
      memoryIds.push(sharedId);
      await uploadJson(indexName, { memoryIds });
    }
  }
}
