const readline = require('readline-sync'); 
const solana = require('@solana/web3.js');
const buffer = require('buffer');
const crypto = require("crypto");

const rpcUrl = "https://api.devnet.solana.com";
let connection1 = new solana.Connection(rpcUrl, 'confirmed');
let connection2 = new solana.Connection(rpcUrl, 'confirmed');

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

const player1 = solana.Keypair.fromSeed(new Uint8Array(32).fill(1));
const player2 = solana.Keypair.fromSeed(new Uint8Array(32).fill(42));


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

async function retry(transaction, player) {
    if (player === -1) {
        try {
            await solana.sendAndConfirmTransaction(connection1, transaction,[player1]);
        } catch (error) {
            if (error.message.includes("FetchError")) {
                console.log("reconnecting");
                connection1 = new solana.Connection(rpcUrl, 'confirmed');
                retry(transaction, player);
            } else {
                throw error;
            }
        }
    } else {
        if (player === 1) {
            try {
                await solana.sendAndConfirmTransaction(connection2, transaction,[player2]);
            } catch (error) {
                if (error.message.includes("FetchError")) {
                    console.log("reconnecting");
                    connection2 = new solana.Connection(rpcUrl, 'confirmed');
                    retry(transaction, player);
                } else {
                    throw error;
                }
            }
        }
    }
}

async function getInfo(account, player) {
    let info;
    if (player === -1) {
        try {
            info = await connection1.getAccountInfo(account);
        } catch (error) {
            if (error.message.includes("FetchError")) {
                console.log("reconnecting");
                connection1 = new solana.Connection(rpcUrl, 'confirmed');
                info = getInfo(account, player);
            } else {
                throw error;
            }
        }
    } else {
        if (player === 1) {
            try {
                info = await connection2.getAccountInfo(account);
            } catch (error) {
                if (error.message.includes("FetchError")) {
                    console.log("reconnecting");
                    connection2 = new solana.Connection(rpcUrl, 'confirmed');
                    info = getInfo(account, player);
                } else {
                    throw error;
                }
            }
        }
    }
    return info;
}


function display() {
    console.log("=".repeat(100));
    console.log("=".repeat(100));
    const top = 13 + "\t" + 14 + "\t" + 15 + "\t" + 16 + "\t" + 17 + "\t" + 18 + "\t" + "mid" + "\t" + 19 + "\t" + 20 + "\t" + 21 + "\t" + 22 + "\t" + 23 + "\t" + 24 + "\t" + "right" + "\t" + "\t" + "die";
    console.log(top);
    console.log();
    const sb = board.map(x => (x <= 0 ? "" : "+") + x);
    const sm = ["-" + midBoard[0], "+" + midBoard[1]];
    const sr = ["-" + rightBoard[0], "+" + rightBoard[1]];
    const top1 = sb[12] + "\t" + sb[13] + "\t" + sb[14] + "\t" + sb[15] + "\t" + sb[16] + "\t" + sb[17] + "\t" + sm[0] + "\t" + sb[18] + "\t" + sb[19] + "\t" + sb[20] + "\t" + sb[21] + "\t" + sb[22] + "\t" + sb[23] + "\t" + sr[0] + "\t" + "\t" + dice[0];
    console.log(top1);
    console.log();
    console.log();
    console.log("-".repeat(100));
    console.log();
    console.log();
    const bot1 = sb[11] + "\t" + sb[10] + "\t" + sb[9] + "\t" + sb[8] + "\t" + sb[7] + "\t" + sb[6] + "\t" + sm[1] + "\t" + sb[5] + "\t" + sb[4] + "\t" + sb[3] + "\t" + sb[2] + "\t" + sb[1] + "\t" + sb[0] + "\t" + sr[1] + "\t" + "\t" + dice[1];
    console.log(bot1);
    console.log();
    const bot = 12 + "\t" + 11 + "\t" + 10 + "\t" + 9 + "\t" + 8 + "\t" + 7 + "\t" + "mid" + "\t" + 6 + "\t" + 5 + "\t" + 4 + "\t" + 3 + "\t" + 2 + "\t" + 1 + "\t" + "right" + "\t" + "\t" + "die";
    console.log(bot);
    console.log("=".repeat(100));
    console.log("=".repeat(100));
};

function checkMove(player, steps) {
    if (player === -1) {
        if (midBoard[0] > 0) {
            for (const step of steps) {
                if (board[step-1] <= 1) {
                    return true;
                }
            }
        } else {
            for (const step of steps) {
                for (let i = 0; i < 24; ++i) {
                    if (board[i] < 0) {
                        if (i + step >= 24) {
                            return true;
                        }
                        if (board[i+step] <= 1) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    } else {
        if (midBoard[1] > 0) {
            for (const step of steps) {
                if (board[24-step] >= -1) {
                    return true;
                }
            }
        } else {
            for (const step of steps) {
                for (let i = 0; i < 24; ++i) {
                    if (board[i] > 0) {
                        if (i - step < 0) {
                            return true;
                        }
                        if (board[i-step] >= -1) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
}

function checkStep(step) {
    if (step <= 6 && step >= 1) {
        return true;
    }
    console.log("step out of boundary");
    return false;
}

function checkStart(start) {
    if (start <= 24 || start >= 1) {
        return true;
    }
    console.log("start out of boundary");
    return false;
}

async function checkBoard(data) {
    const info = data.slice(87, 141);
    if ((info[52] != rightBoard[0]) || (info[53] != rightBoard[1])) {
        console.log("right board does not match", info[52], info[53]);
        rightBoard[0] = info[52];
        rightBoard[1] = info[53];
    }
    if ((info[1] != midBoard[0]) || (info[51] != midBoard[1])) {
        console.log("mid board does not match", info[1], info[51]);
        midBoard[0] = info[1];
        midBoard[1] = info[51];
    }
    for (let i = 0; i < 24; ++i) {
        const actual = (info[2+i*2] * 2 - 3) * info[3+i*2];
        if (actual != board[i]) {
            console.log("board does not match", i, actual);
            board[i] = actual;
        }
    }
}


(async () => {
    
    const [game, game_seed] = await solana.PublicKey.findProgramAddress([player1.publicKey.toBytes(), player2.publicKey.toBytes(), game_id], program_id);
    console.log("game", game.toBase58());

    // const airdropSignature1 = await connection1.requestAirdrop(player1.publicKey, 1000000000);
    // await connection1.confirmTransaction(airdropSignature1);
    

    // await new Promise(resolve => setTimeout(resolve, 60000));

    const airdropSignature2 = await connection2.requestAirdrop(player2.publicKey, 1000000000);
    await connection2.confirmTransaction(airdropSignature2);

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
    await retry(new solana.Transaction().add(initialize), -1);
    console.log("initialized");


    let turn = 0;
    while (turn === 0) {
        const roll1 = new solana.TransactionInstruction({
            programId: program_id,
            keys: [
                {pubkey: player1.publicKey, isSigner: false, isWritable: false},
                {pubkey: game, isSigner: false, isWritable: true},
                {pubkey: clock, isSigner: false, isWritable: false}
            ],
            data: buffer.Buffer.from([1])
            
        });
        await retry(new solana.Transaction().add(roll1), -1);
        const roll2 = new solana.TransactionInstruction({
            programId: program_id,
            keys: [
                {pubkey: player2.publicKey, isSigner: false, isWritable: false},
                {pubkey: game, isSigner: false, isWritable: true},
                {pubkey: clock, isSigner: false, isWritable: false}
            ],
            data: buffer.Buffer.from([1])
            
        });
        await retry(new solana.Transaction().add(roll2), 1);
        console.log("deciding first player")
        const game_info = await getInfo(game, -1);
        dice[0] = game_info.data[75];
        dice[1] = game_info.data[76];
        if (dice[0] === dice[1]) {
            continue;
        }
        turn = game_info.data[73] * 2 - 3;
        console.log(`player ${turn} is first`);
    }
    while ((rightBoard[0] < 15) && (rightBoard[1] < 15)) {

        display();
        
        let avail;
        if (dice[0] === dice[1]) {
            avail = [...dice, ...dice];
        } else {
            avail = [...dice];
        }
        const actions = Buffer.alloc(8);
        let action_cnt = 0;
        while (checkMove(turn, avail)) {
            if (turn === -1) {
                if (midBoard[0] > 0) {
                    const step = parseInt(readline.question("How many steps do player -1 want to move: "));
                    if (!checkStep(step)) {
                        continue;
                    }
                    if (board[step-1] > 1) {
                        console.log("You can not move here");
                        continue;
                    }
                    let i = avail.indexOf(step);
                    if (i === -1) {
                        console.log("There is no such move");
                        continue;
                    }
                    avail.splice(i, 1);
                    midBoard[0] -= 1;
                    if (board[step-1] === 1) {
                        board[step-1] = -1;
                        midBoard[1] += 1;
                    } else {
                        board[step-1] -= 1;
                    }
                    actions[action_cnt*2] = 0;
                    actions[action_cnt*2+1] = step;
                    action_cnt += 1;
                } else {
                    const start = parseInt(readline.question("Which checker do player -1 want to move: "));
                    if (!checkStart(start)) {
                        continue;
                    }
                    if (board[start-1] >= 0) {
                        console.log("There is no such checker");
                        continue;
                    }
                    const step = parseInt(readline.question("How many steps do player -1 want to move: "));
                    if (!checkStep(step)) {
                        continue;
                    }
                    if ((start - 1 + step < 24) && (board[start - 1 + step] > 1)) {
                        console.log("You can not move here");
                        continue;
                    }
                    let i = avail.indexOf(step);
                    if (i === -1) {
                        console.log("There is no such move");
                        continue;
                    }
                    avail.splice(i, 1);
                    board[start-1] += 1;
                    if (start + step - 1 >= 24) {
                        rightBoard[0] += 1;
                    } else if (board[start - 1 + step] === 1) {
                        board[start-1+step] = -1;
                        midBoard[1] += 1;
                    } else {
                        board[start-1+step] -= 1;
                    }
                    actions[action_cnt*2] = start;
                    actions[action_cnt*2+1] = step;
                    action_cnt += 1;
                }
            } else {
                if (midBoard[1] > 0) {
                    const step = parseInt(readline.question("How many steps do player +1 want to move: "));
                    if (!checkStep(step)) {
                        continue;
                    }
                    if (board[24-step] < -1) {
                        console.log("You can not move here");
                        continue;
                    }
                    let i = avail.indexOf(step);
                    if (i === -1) {
                        console.log("There is no such move");
                        continue;
                    }
                    avail.splice(i, 1);
                    midBoard[1] -= 1;
                    if (board[24-step] === -1) {
                        board[24-step] = 1;
                        midBoard[0] += 1;
                    } else {
                        board[24-step] += 1;
                    }
                    actions[action_cnt*2] = 25;
                    actions[action_cnt*2+1] = step;
                    action_cnt += 1;
                } else {
                    const start = parseInt(readline.question("Which checker do player +1 want to move: "));
                    if (!checkStart(start)) {
                        continue;
                    }
                    if (board[start-1] <= 0) {
                        console.log("There is no such checker");
                        continue;
                    }
                    const step = parseInt(readline.question("How many steps do player +1 want to move: "));
                    if (!checkStep(step)) {
                        continue;
                    }
                    if ((start - 1 - step >= 0) && (board[start - 1 - step] < -1)) {
                        console.log("You can not move here");
                        continue;
                    }
                    let i = avail.indexOf(step);
                    if (i === -1) {
                        console.log("There is no such move");
                        continue;
                    }
                    avail.splice(i, 1);
                    board[start-1] -= 1;
                    if (start - step - 1 < 0) {
                        rightBoard[1] += 1;
                    } else if (board[start-1-step] === -1) {
                        board[start-1-step] = 1;
                        midBoard[0] += 1;
                    } else {
                        board[start-1-step] += 1;
                    }
                    actions[action_cnt*2] = start;
                    actions[action_cnt*2+1] = step;
                    action_cnt += 1;
                }
            }
            display();
        }

        if (turn === -1) {
            const move = new solana.TransactionInstruction({
                programId: program_id,
                keys: [
                    {pubkey: player1.publicKey, isSigner: false, isWritable: false},
                    {pubkey: game, isSigner: false, isWritable: true},
                    {pubkey: clock, isSigner: false, isWritable: false}
                ],
                data: buffer.Buffer.from([4, ...actions])
            });
            await retry(new solana.Transaction().add(move), -1);
            console.log("saving moves");
            const game_info = await getInfo(game, -1);
            checkBoard(game_info.data);
        } else {
            const move = new solana.TransactionInstruction({
                programId: program_id,
                keys: [
                    {pubkey: player2.publicKey, isSigner: false, isWritable: false},
                    {pubkey: game, isSigner: false, isWritable: true},
                    {pubkey: clock, isSigner: false, isWritable: false}
                ],
                data: buffer.Buffer.from([4, ...actions])
                
            });
            await retry(new solana.Transaction().add(move), 1);
            console.log("saving moves");
            const game_info = await getInfo(game, 1);
            checkBoard(game_info.data);
        }

        turn = -turn;
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
            await retry(new solana.Transaction().add(roll), -1);
            console.log("rolliing dices");
            const game_info = await getInfo(game, -1);
            dice[0] = game_info.data[75];
            dice[1] = game_info.data[76];
        } else {
            let roll = new solana.TransactionInstruction({
                programId: program_id,
                keys: [
                    {pubkey: player2.publicKey, isSigner: false, isWritable: false},
                    {pubkey: game, isSigner: false, isWritable: true},
                    {pubkey: clock, isSigner: false, isWritable: false}
                ],
                data: buffer.Buffer.from([1])
                
            });
            await retry(new solana.Transaction().add(roll), 1);
            console.log("rolliing dices");
            const game_info = await getInfo(game, 1);
            dice[0] = game_info.data[75];
            dice[1] = game_info.data[76];
        }
    }
})();