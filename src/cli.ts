import * as dotenv from 'dotenv';
dotenv.config();

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
