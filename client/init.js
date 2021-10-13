const readline = require('readline-sync'); 
const solana = require('@solana/web3.js');
const buffer = require('buffer');
const crypt = require('crypto');
const bs58 = require('bs58');

const rpcUrl = "https://api.devnet.solana.com";
const system = solana.PublicKey.default;
const connection = new solana.Connection(rpcUrl, 'confirmed');
const player = solana.Keypair.fromSeed(new Uint8Array(32).fill(1));
const queue = solana.Keypair.fromSecretKey(bs58.decode("61rGU9tSnQWz8wh3i4wZFJP8rXWC7ArR3nDQMqtqRNxe6JqNuvB6QobqPFbxBdBz6yswydYrDpyEmFeLyPpBWRaB"));
console.log(queue.publicKey.toBase58());
console.log(bs58.encode(queue.secretKey));

(async () => {
// const createAccount = new solana.Transaction().add(
//     solana.SystemProgram.createAccount({
//         fromPubkey: player.publicKey,
//         newAccountPubkey: queue.publicKey,
//         lamports: 1000000000,
//         space: 64,
//         programId: system,
//     })
// );
// await solana.sendAndConfirmTransaction(connection, createAccount, [player, queue]);
console.log(await connection.getAccountInfo(queue.publicKey));
})();