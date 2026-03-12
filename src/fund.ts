import * as dotenv from 'dotenv';
dotenv.config();

import { shelbyClient, account } from './shelby.js';

const address = account.accountAddress.toString();
console.log('Funding account:', address);

// Fund with APT for gas
const aptHash = await shelbyClient.fundAccountWithAPT({ address, amount: 100_000_000 }); // 1 APT
console.log('APT funded, tx:', aptHash);

// Fund with ShelbyUSD for storage
const susdHash = await shelbyClient.fundAccountWithShelbyUSD({ address, amount: 1_000_000 }); // 1 ShelbyUSD
console.log('ShelbyUSD funded, tx:', susdHash);

console.log('Done! Account is ready.');
