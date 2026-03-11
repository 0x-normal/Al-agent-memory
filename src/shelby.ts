import { ShelbyNodeClient } from '@shelby-protocol/sdk/node';
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
  rpc: {
    baseUrl: 'https://api.testnet.shelby.xyz/shelby',
    apiKey,
  },
});

const privateKey = new Ed25519PrivateKey(privateKeyHex);
export const account = new Ed25519Account({ privateKey });
