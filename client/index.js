const readline = require('readline-sync'); 
const rpcUrl = "https://api.devnet.solana.com";
const solana = require('@solana/web3.js')
const connection1 = new solana.Connection(rpcUrl, 'confirmed');
const connection2 = new solana.Connection(rpcUrl, 'confirmed');

let board = [-2, 0, 0, 0, 0, 5, 0, 3, 0, 0, 0, -5, 5, 0, 0, 0, -3, 0, -5, 0, 0, 0, 0, 2];
let midBoard = [0, 0];
let rightBoard = [0, 0];

let player1 = readline.question("Secret key string of player 1: ");
let player2 = readline.question("Secret key string of player 2: ");

player1 = getKeypair(player1);
player2 = getKeypair(player2);
console.log(player1.publicKey.toBase58());
console.log(player2.publicKey.toBase58());

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
    const top = 13 + "\t" + 14 + "\t" + 15 + "\t" + 16 + "\t" + 17 + "\t" + 18 + "\t" + "mid" + "\t" + 19 + "\t" + 20 + "\t" + 21 + "\t" + 22 + "\t" + 23 + "\t" + 24 + "\t" + "right";
    console.log(top);
    let sb = board.map(x => (x <= 0 ? "" : "+") + x);
    let sm = ["-" + midBoard[0], "+" + midBoard[1]];
    let sr = ["-" + rightBoard[0], "+" + rightBoard[1]];
    let top1 = sb[12] + "\t" + sb[13] + "\t" + sb[14] + "\t" + sb[15] + "\t" + sb[16] + "\t" + sb[17] + "\t" + sm[0] + "\t" + sb[18] + "\t" + sb[19] + "\t" + sb[20] + "\t" + sb[21] + "\t" + sb[22] + "\t" + sb[23] + "\t" + sr[0];
    console.log(top1);
    console.log("-".repeat(100));
    let bot1 = sb[11] + "\t" + sb[10] + "\t" + sb[9] + "\t" + sb[8] + "\t" + sb[7] + "\t" + sb[6] + "\t" + sm[1] + "\t" + sb[5] + "\t" + sb[4] + "\t" + sb[3] + "\t" + sb[2] + "\t" + sb[1] + "\t" + sb[0] + "\t" + sr[1];
    console.log(bot1);
    const bot = 12 + "\t" + 11 + "\t" + 10 + "\t" + 9 + "\t" + 8 + "\t" + 7 + "\t" + "mid" + "\t" + 6 + "\t" + 5 + "\t" + 4 + "\t" + 3 + "\t" + 2 + "\t" + 1 + "\t" + "right";
    console.log(bot);
    console.log("=".repeat(100));
    console.log("=".repeat(100));
};


(async () => {
    


    const airdropSignature1 = await connection1.requestAirdrop(player1.publicKey, 1000000000);
    await connection1.confirmTransaction(airdropSignature1);
    

    await new Promise(resolve => setTimeout(resolve, 60000));

    const airdropSignature2 = await connection2.requestAirdrop(player2.publicKey, 1000000000);
    await connection2.confirmTransaction(airdropSignature2);

    turn = -1
    while ((rightBoard[0] < 15) && (rightBoard[1] < 15)) {
        display();
        break;
    }



})();