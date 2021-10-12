const readline = require('readline-sync'); 
const rpcUrl = "https://api.devnet.solana.com";
const solana = require('@solana/web3.js');
const buffer = require('buffer');
const crypto = require("crypto");

const connection1 = new solana.Connection(rpcUrl, 'confirmed');
const connection2 = new solana.Connection(rpcUrl, 'confirmed');

let board = [-2, 0, 0, 0, 0, 5, 0, 3, 0, 0, 0, -5, 5, 0, 0, 0, -3, 0, -5, 0, 0, 0, 0, 2];
let midBoard = [0, 0];
let rightBoard = [0, 0];
let dice = [0, 0];

const game_id = crypto.randomBytes(8);
console.log("game id", game_id);

const program_id = new solana.PublicKey("Aqqg8L83rjkNfhLzAeZ4Aq37TBZyXnvLPWRTMruTWmJ8");

// let player1 = readline.question("Secret key string of player 1: ");
// let player2 = readline.question("Secret key string of player 2: ");

// player1 = getKeypair(player1);
// player2 = getKeypair(player2);

player1 = solana.Keypair.fromSeed(new Uint8Array(32).fill(1));
player2 = solana.Keypair.fromSeed(new Uint8Array(32).fill(2));


console.log("player1", player1.publicKey.toBase58());
console.log("player2", player2.publicKey.toBase58());

const system = solana.PublicKey.default;
console.log("system program id", system.toBase58());
const rent = solana.SYSVAR_RENT_PUBKEY;
console.log("rent program id", rent.toBase58());
const clock = solana.SYSVAR_CLOCK_PUBKEY;
console.log("clock program id", clock.toBase58());

function getKeypair(player) {
    if (player != "") {
        return solana.Keypair.fromSecretKey(JSON.parse(player));
    } else {
        return solana.Keypair.generate();
        
    }
}

function display() {
    console.log("=".repeat(100));
    console.log("=".repeat(100));
    const top = 13 + "\t" + 14 + "\t" + 15 + "\t" + 16 + "\t" + 17 + "\t" + 18 + "\t" + "mid" + "\t" + 19 + "\t" + 20 + "\t" + 21 + "\t" + 22 + "\t" + 23 + "\t" + 24 + "\t" + "right" + "\t" + "\t" + "dice";
    console.log(top);
    let sb = board.map(x => (x <= 0 ? "" : "+") + x);
    let sm = ["-" + midBoard[0], "+" + midBoard[1]];
    let sr = ["-" + rightBoard[0], "+" + rightBoard[1]];
    let top1 = sb[12] + "\t" + sb[13] + "\t" + sb[14] + "\t" + sb[15] + "\t" + sb[16] + "\t" + sb[17] + "\t" + sm[0] + "\t" + sb[18] + "\t" + sb[19] + "\t" + sb[20] + "\t" + sb[21] + "\t" + sb[22] + "\t" + sb[23] + "\t" + sr[0] + "\t" + "\t" + dice[0];
    console.log(top1);
    console.log("-".repeat(100));
    let bot1 = sb[11] + "\t" + sb[10] + "\t" + sb[9] + "\t" + sb[8] + "\t" + sb[7] + "\t" + sb[6] + "\t" + sm[1] + "\t" + sb[5] + "\t" + sb[4] + "\t" + sb[3] + "\t" + sb[2] + "\t" + sb[1] + "\t" + sb[0] + "\t" + sr[1] + "\t" + "\t" + dice[1];
    console.log(bot1);
    const bot = 12 + "\t" + 11 + "\t" + 10 + "\t" + 9 + "\t" + 8 + "\t" + 7 + "\t" + "mid" + "\t" + 6 + "\t" + 5 + "\t" + 4 + "\t" + 3 + "\t" + 2 + "\t" + 1 + "\t" + "right" + "\t" + "\t" + "dice";
    console.log(bot);
    console.log("=".repeat(100));
    console.log("=".repeat(100));
};


(async () => {
    
    const [game, game_seed] = await solana.PublicKey.findProgramAddress([player1.publicKey.toBytes(), player2.publicKey.toBytes(), game_id], program_id);
    console.log("game", game.toBase58());
    // const airdropSignature1 = await connection1.requestAirdrop(player1.publicKey, 1000000000);
    // await connection1.confirmTransaction(airdropSignature1);
    

    // await new Promise(resolve => setTimeout(resolve, 60000));

    // const airdropSignature2 = await connection2.requestAirdrop(player2.publicKey, 1000000000);
    // await connection2.confirmTransaction(airdropSignature2);

    const initialize = new solana.TransactionInstruction({
        programId: program_id,
        keys: [
            {pubkey: player1.publicKey, isSigner: false, isWritable: false},
            {pubkey: player2.publicKey, isSigner: false, isWritable: false},
            {pubkey: game, isSigner: false, isWritable: true},
            {pubkey: system, isSigner: false, isWritable: false},
            {pubkey: rent, isSigner: false, isWritable: false}
        ],
        data: buffer.Buffer.from([0, ...game_id])
    });
    await solana.sendAndConfirmTransaction(connection1, new solana.Transaction().add(initialize),[player1]);
    console.log("initialized");


    turn = -1
    while ((rightBoard[0] < 15) && (rightBoard[1] < 15)) {
        if (turn === -1) {
            let roll = new solana.TransactionInstruction({
                programId: program_id,
                keys: [
                    {pubkey: player1.publicKey, isSigner: false, isWritable: false},
                    {pubkey: game, isSigner: false, isWritable: true},
                    {pubkey: clock, isSigner: false, isWritable: false}
                ],
                data: buffer.Buffer.from([1])
                
            });
            await solana.sendAndConfirmTransaction(connection1, new solana.Transaction().add(roll),[player1]);
            console.log("rolliing dices");
            game_info = await connection1.getAccountInfo(game);
            console.log(game_info.data[75]);
            console.log(game_info.data[76]);
        }
        display();
        break;
    }



})();