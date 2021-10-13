const readline = require('readline-sync'); 
const solana = require('@solana/web3.js');
const buffer = require('buffer');
const crypt = require('crypto');
const bs58 = require('bs58');

const rpcUrl = "https://api.devnet.solana.com";
const connection = new solana.Connection(rpcUrl, 'confirmed');
const player = solana.Keypair.fromSeed(new Uint8Array(32).fill(1));
const system = solana.PublicKey.default;
const queue = solana.Keypair.generate();
console.log(queue.publicKey.toBase58());
console.log(queue.secretKey.toBase58());

const createAccount = new solana.Transaction().add(
    solana.SystemProgram.createAccount({
      fromPubkey: player.publicKey,
      basePubkey: queue.publicKey,
      lamport: 1.0,
      newAccountPubkey: greetedPubkey,
      lamports,
      space: GREETING_SIZE,
      programId,
    }),
  );
  await sendAndConfirmTransaction(connection, transaction, [payer]);

const program_id = new solana.PublicKey("Aqqg8L83rjkNfhLzAeZ4Aq37TBZyXnvLPWRTMruTWmJ8");
const system = solana.PublicKey.default;
const rent = solana.SYSVAR_RENT_PUBKEY;

let board = [-2, 0, 0, 0, 0, 5, 0, 3, 0, 0, 0, -5, 5, 0, 0, 0, -3, 0, -5, 0, 0, 0, 0, 2];
let midBoard = [0, 0];
let rightBoard = [0, 0];
let dice = [0, 0];
let multiplier = 1;

console.log("Welcome to solana-backgammon!");
const secretKey = readline.question('Please enter your secret key: ');
let player1;
if (secretKey === "1") {
    player1 = solana.Keypair.fromSeed(new Uint8Array(32).fill(1));
} else if (secretKey === "2") {
    player1 = solana.Keypair.fromSeed(new Uint8Array(32).fill(42));
} else {
    player1 = solana.Keypair.fromSecretKey(bs58.decode(secretKey));
}

let order;
let game_id = readline.question("Room key you want to join (default: create room): ");
if (game_id === "") {
    game_id = crypt.randomBytes(8);
    console.log("game key: ", bs58.encode(game_id));
    order = -1;
} else {
    game_id = bs58.decode(game_id);
    order = 1;
}

async function retry(transaction, player) {
    if (player === -1) {
        try {
            await solana.sendAndConfirmTransaction(connection1, transaction, [player1]);
        } catch (error) {
            console.log(error.message);
            if (error.message.includes("FetchError")) {
                connection1 = new solana.Connection(rpcUrl, 'confirmed');
                await retry(transaction, player);
                console.log("reconnecting");
            } else {
                throw error;
            }
        }
    } else {
        try {
            await solana.sendAndConfirmTransaction(connection2, transaction, [player2]);
        } catch (error) {
            console.log(error.message);
            if (error.message.includes("FetchError")) {
                connection2 = new solana.Connection(rpcUrl, 'confirmed');
                await retry(transaction, player);
                console.log("reconnecting");
            } else {
                throw error;
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
            console.log(error.message);
            if (error.message.includes("FetchError")) {
                connection1 = new solana.Connection(rpcUrl, 'confirmed');
                info = await getInfo(account, player);
                console.log("reconnecting");
            } else {
                throw error;
            }
        }
    } else {
        try {
            info = await connection2.getAccountInfo(account);
        } catch (error) {
            console.log(error.message);
            if (error.message.includes("FetchError")) {
                connection2 = new solana.Connection(rpcUrl, 'confirmed');
                info = await getInfo(account, player);
                console.log("reconnecting");
            } else {
                throw error;
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
    const sb = board.map(x => (x <= 0 ? "" : "\x1b[32m+") + x + "\x1b[0m").map(x => (x[0] === "-" ? "\x1b[31m" : "") + x);
    const sm = ["\x1b[31m-" + midBoard[0] + "\x1b[0m", "\x1b[32m+" + midBoard[1] + "\x1b[0m"];
    const sr = ["\x1b[31m-" + rightBoard[0] + "\x1b[0m", "\x1b[32m+" + rightBoard[1] + "\x1b[0m"];
    const top1 = sb[12] + "\t" + sb[13] + "\t" + sb[14] + "\t" + sb[15] + "\t" + sb[16] + "\t" + sb[17] + "\t" + sm[0] + "\t" + sb[18] + "\t" + sb[19] + "\t" + sb[20] + "\t" + sb[21] + "\t" + sb[22] + "\t" + sb[23] + "\t" + sr[0] + "\t" + "\t" + dice[0];
    console.log(top1);
    console.log();
    console.log();
    console.log("-".repeat(100) + "\t" + "multiplier: " + multiplier);
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
    if (start <= 24 && start >= 1) {
        return true;
    }
    console.log("start out of boundary");
    return false;
}

function checkBoard(data) {
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
    
    let order;
    let game_id = readline.question("Room key you want to join (default: create room): ");
    if (game_id === "") {
        game_id = crypt.randomBytes(8);
        console.log("game key: ", bs58.encode(game_id));
        order = -1;
    } else {
        game_id = bs58.decode(game_id);
        order = 1;
    }

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
    await retry(new solana.Transaction().add(initialize), -1);
    console.log("initialized");

    let game_info = await getInfo(game, -1);
    let status = game_info.data[8];
    let turn = 0;
    let player;
    while (status != 5) {
        switch (status) {
            case 1: 
                console.log("deciding first player");
                const roll1 = new solana.TransactionInstruction({
                    programId: program_id,
                    keys: [
                        {pubkey: player1.publicKey, isSigner: false, isWritable: false},
                        {pubkey: game, isSigner: false, isWritable: true}
                    ],
                    data: buffer.Buffer.from([1])
                    
                });
                await retry(new solana.Transaction().add(roll1), -1);
                const roll2 = new solana.TransactionInstruction({
                    programId: program_id,
                    keys: [
                        {pubkey: player2.publicKey, isSigner: false, isWritable: false},
                        {pubkey: game, isSigner: false, isWritable: true}
                    ],
                    data: buffer.Buffer.from([1])
                    
                });
                await retry(new solana.Transaction().add(roll2), 1);
                
                game_info = await getInfo(game, -1);
                dice[0] = game_info.data[75];
                dice[1] = game_info.data[76];
                if (dice[0] != dice[1]) {
                    turn = game_info.data[73] * 2 - 3;
                    console.log(`player ${turn} is first`);
                    display();
                }
                status = game_info.data[8];
                break;
            case 2:
                const request = readline.question(`Do player ${turn} want to double (Y/N, default N): `);
                player = (turn === -1 ? player1 : player2);
                if (request[0] == "Y" || request[0] == "y") {
                    const double = new solana.TransactionInstruction({
                        programId: program_id,
                        keys: [
                            {pubkey: player.publicKey, isSigner: false, isWritable: false},
                            {pubkey: game, isSigner: false, isWritable: true},
                        ],
                        data: buffer.Buffer.from([2])
                    });
                    await retry(new solana.Transaction().add(double), turn);
                    console.log(`player ${turn} wants to double`);
                } else {
                    const roll = new solana.TransactionInstruction({
                        programId: program_id,
                        keys: [
                            {pubkey: player.publicKey, isSigner: false, isWritable: false},
                            {pubkey: game, isSigner: false, isWritable: true}
                        ],
                        data: buffer.Buffer.from([1])
                        
                    });
                    await retry(new solana.Transaction().add(roll), turn);
                    console.log(`player ${turn} rolls dices`);
                }
                game_info = await getInfo(game, turn);
                dice[0] = game_info.data[75];
                dice[1] = game_info.data[76];
                display();
                status = game_info.data[8];
                break;
            case 4:
                const reply = readline.question(`Do player ${-turn} accept to double (Y/N, default N): `);
                player = (turn === -1 ? player2 : player1);
                if (reply[0] == "Y" || reply[0] == "y") {
                    const accept = new solana.TransactionInstruction({
                        programId: program_id,
                        keys: [
                            {pubkey: player.publicKey, isSigner: false, isWritable: false},
                            {pubkey: game, isSigner: false, isWritable: true},
                        ],
                        data: buffer.Buffer.from([3, 1])
                    });
                    await retry(new solana.Transaction().add(accept), -turn);
                    console.log(`player ${-turn} accepts`);
                } else {
                    const accept = new solana.TransactionInstruction({
                        programId: program_id,
                        keys: [
                            {pubkey: player.publicKey, isSigner: false, isWritable: false},
                            {pubkey: game, isSigner: false, isWritable: true},
                        ],
                        data: buffer.Buffer.from([3, 0])
                    });
                    await retry(new solana.Transaction().add(accept), -turn);
                    console.log(`player ${-turn} surrenders`);
                }
                game_info = await getInfo(game, turn);
                multiplier = game_info.data[77];
                dice[0] = game_info.data[75];
                dice[1] = game_info.data[76];
                display();
                status = game_info.data[8];
                break;
            case 3:
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
                            console.log("Your available moves are", avail);
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
                            console.log("Your available moves are", avail);
                            const start = parseInt(readline.question("Which checker do player -1 want to move: "));
                            if (!checkStart(start)) {
                                continue;
                            }
                            if (board[start-1] >= 0) {
                                console.log("There is no such checker");
                                continue;
                            }
                            console.log("Your available moves are", avail);
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
                            console.log("Your available moves are", avail);
                            const step = parseInt(readline.question("How many steps do player 1 want to move: "));
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
                            console.log("Your available moves are", avail);
                            const start = parseInt(readline.question("Which checker do player 1 want to move: "));
                            if (!checkStart(start)) {
                                continue;
                            }
                            if (board[start-1] <= 0) {
                                console.log("There is no such checker");
                                continue;
                            }
                            console.log("Your available moves are", avail);
                            const step = parseInt(readline.question("How many steps do player 1 want to move: "));
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
                player = (turn === -1 ? player1 : player2);
                const move = new solana.TransactionInstruction({
                    programId: program_id,
                    keys: [
                        {pubkey: player.publicKey, isSigner: false, isWritable: false},
                        {pubkey: game, isSigner: false, isWritable: true}
                    ],
                    data: buffer.Buffer.from([4, ...actions])
                });
                await retry(new solana.Transaction().add(move), turn);
                console.log("saving moves");
                game_info = await getInfo(game, turn);
                dice[0] = game_info.data[75];
                dice[1] = game_info.data[76];
                checkBoard(game_info.data);
                display();
                status = game_info.data[8];
                turn = game_info.data[73] * 2 - 3;
                break;
        }
    }
    console.log("game finishes");
    game_info = await getInfo(game, turn);
    const winner = game_info.data[74] * 2 - 3;
    console.log(`player ${winner} wins ${multiplier}`);

//     let turn = 0;
//     while (turn === 0) {
//         const roll1 = new solana.TransactionInstruction({
//             programId: program_id,
//             keys: [
//                 {pubkey: player1.publicKey, isSigner: false, isWritable: false},
//                 {pubkey: game, isSigner: false, isWritable: true}
//             ],
//             data: buffer.Buffer.from([1])
            
//         });
//         await retry(new solana.Transaction().add(roll1), -1);
//         const roll2 = new solana.TransactionInstruction({
//             programId: program_id,
//             keys: [
//                 {pubkey: player2.publicKey, isSigner: false, isWritable: false},
//                 {pubkey: game, isSigner: false, isWritable: true}
//             ],
//             data: buffer.Buffer.from([1])
            
//         });
//         await retry(new solana.Transaction().add(roll2), 1);
//         console.log("deciding first player")
//         let game_info = await getInfo(game, -1);
//         dice[0] = game_info.data[75];
//         dice[1] = game_info.data[76];
//         if (dice[0] === dice[1]) {
//             continue;
//         }
//         turn = game_info.data[73] * 2 - 3;
//         console.log(`player ${turn} is first`);
//     }

//     let doubleRoll = false;
//     while ((rightBoard[0] < 15) && (rightBoard[1] < 15)) {
        
//         display();
        
//         let avail;
//         if (dice[0] === dice[1]) {
//             avail = [...dice, ...dice];
//         } else {
//             avail = [...dice];
//         }
//         const actions = Buffer.alloc(8);
//         let action_cnt = 0;
//         while (checkMove(turn, avail)) {
//             if (turn === -1) {
//                 if (midBoard[0] > 0) {
//                     const step = parseInt(readline.question("How many steps do player -1 want to move: "));
//                     if (!checkStep(step)) {
//                         continue;
//                     }
//                     if (board[step-1] > 1) {
//                         console.log("You can not move here");
//                         continue;
//                     }
//                     let i = avail.indexOf(step);
//                     if (i === -1) {
//                         console.log("There is no such move");
//                         continue;
//                     }
//                     avail.splice(i, 1);
//                     midBoard[0] -= 1;
//                     if (board[step-1] === 1) {
//                         board[step-1] = -1;
//                         midBoard[1] += 1;
//                     } else {
//                         board[step-1] -= 1;
//                     }
//                     actions[action_cnt*2] = 0;
//                     actions[action_cnt*2+1] = step;
//                     action_cnt += 1;
//                 } else {
//                     const start = parseInt(readline.question("Which checker do player -1 want to move: "));
//                     if (!checkStart(start)) {
//                         continue;
//                     }
//                     if (board[start-1] >= 0) {
//                         console.log("There is no such checker");
//                         continue;
//                     }
//                     const step = parseInt(readline.question("How many steps do player -1 want to move: "));
//                     if (!checkStep(step)) {
//                         continue;
//                     }
//                     if ((start - 1 + step < 24) && (board[start - 1 + step] > 1)) {
//                         console.log("You can not move here");
//                         continue;
//                     }
//                     let i = avail.indexOf(step);
//                     if (i === -1) {
//                         console.log("There is no such move");
//                         continue;
//                     }
//                     avail.splice(i, 1);
//                     board[start-1] += 1;
//                     if (start + step - 1 >= 24) {
//                         rightBoard[0] += 1;
//                     } else if (board[start - 1 + step] === 1) {
//                         board[start-1+step] = -1;
//                         midBoard[1] += 1;
//                     } else {
//                         board[start-1+step] -= 1;
//                     }
//                     actions[action_cnt*2] = start;
//                     actions[action_cnt*2+1] = step;
//                     action_cnt += 1;
//                 }
//             } else {
//                 if (midBoard[1] > 0) {
//                     const step = parseInt(readline.question("How many steps do player +1 want to move: "));
//                     if (!checkStep(step)) {
//                         continue;
//                     }
//                     if (board[24-step] < -1) {
//                         console.log("You can not move here");
//                         continue;
//                     }
//                     let i = avail.indexOf(step);
//                     if (i === -1) {
//                         console.log("There is no such move");
//                         continue;
//                     }
//                     avail.splice(i, 1);
//                     midBoard[1] -= 1;
//                     if (board[24-step] === -1) {
//                         board[24-step] = 1;
//                         midBoard[0] += 1;
//                     } else {
//                         board[24-step] += 1;
//                     }
//                     actions[action_cnt*2] = 25;
//                     actions[action_cnt*2+1] = step;
//                     action_cnt += 1;
//                 } else {
//                     const start = parseInt(readline.question("Which checker do player +1 want to move: "));
//                     if (!checkStart(start)) {
//                         continue;
//                     }
//                     if (board[start-1] <= 0) {
//                         console.log("There is no such checker");
//                         continue;
//                     }
//                     const step = parseInt(readline.question("How many steps do player +1 want to move: "));
//                     if (!checkStep(step)) {
//                         continue;
//                     }
//                     if ((start - 1 - step >= 0) && (board[start - 1 - step] < -1)) {
//                         console.log("You can not move here");
//                         continue;
//                     }
//                     let i = avail.indexOf(step);
//                     if (i === -1) {
//                         console.log("There is no such move");
//                         continue;
//                     }
//                     avail.splice(i, 1);
//                     board[start-1] -= 1;
//                     if (start - step - 1 < 0) {
//                         rightBoard[1] += 1;
//                     } else if (board[start-1-step] === -1) {
//                         board[start-1-step] = 1;
//                         midBoard[0] += 1;
//                     } else {
//                         board[start-1-step] += 1;
//                     }
//                     actions[action_cnt*2] = start;
//                     actions[action_cnt*2+1] = step;
//                     action_cnt += 1;
//                 }
//             }
//             display();
//         }

//         if (turn === -1) {
//             const move = new solana.TransactionInstruction({
//                 programId: program_id,
//                 keys: [
//                     {pubkey: player1.publicKey, isSigner: false, isWritable: false},
//                     {pubkey: game, isSigner: false, isWritable: true}
//                 ],
//                 data: buffer.Buffer.from([4, ...actions])
//             });
//             await retry(new solana.Transaction().add(move), -1);
//             console.log("saving moves");
            
//         } else {
//             const move = new solana.TransactionInstruction({
//                 programId: program_id,
//                 keys: [
//                     {pubkey: player2.publicKey, isSigner: false, isWritable: false},
//                     {pubkey: game, isSigner: false, isWritable: true}
//                 ],
//                 data: buffer.Buffer.from([4, ...actions])
                
//             });
//             await retry(new solana.Transaction().add(move), 1);
//             console.log("saving moves");
//         }
//         let game_info = await getInfo(game, turn);
//         checkBoard(game_info.data);
//         turn = game_info.data[73] * 2 - 3;
//         doubleRoll = (game_info.data[8] === 2);

//         if ((turn === -1) && doubleRoll) {
//             const request = readline.question(`Do player -1 want to double (Y/N, default N): `);
//             if (request[0] == "Y" || request[0] == "y") {
//                 const double = new solana.TransactionInstruction({
//                     programId: program_id,
//                     keys: [
//                         {pubkey: player1.publicKey, isSigner: false, isWritable: false},
//                         {pubkey: game, isSigner: false, isWritable: true},
//                     ],
//                     data: buffer.Buffer.from([2])
//                 });
//                 await retry(new solana.Transaction().add(double), -1);
//                 console.log("player -1 wants to double");
//                 const reply = readline.question(`Do player 1 accept to double (Y/N, default N): `);
//                 if (reply[0] == "Y" || reply[0] == "y") {
//                     const accept = new solana.TransactionInstruction({
//                         programId: program_id,
//                         keys: [
//                             {pubkey: player2.publicKey, isSigner: false, isWritable: false},
//                             {pubkey: game, isSigner: false, isWritable: true},
//                         ],
//                         data: buffer.Buffer.from([3, 1])
//                     });
//                     await retry(new solana.Transaction().add(accept), 1);
//                     console.log("player 1 accepts");
//                     let game_info = await getInfo(game, -1);
//                     multiplier = game_info.data[77];
//                     display();
//                 } else {
//                     const accept = new solana.TransactionInstruction({
//                         programId: program_id,
//                         keys: [
//                             {pubkey: player2.publicKey, isSigner: false, isWritable: false},
//                             {pubkey: game, isSigner: false, isWritable: true},
//                         ],
//                         data: buffer.Buffer.from([3, 0])
//                     });
//                     await retry(new solana.Transaction().add(accept), 1);
//                     console.log("player 1 refuses");
//                 }
//             }
//         } else if ((turn === 1) && doubleRoll) {
//             const request = readline.question(`Do player 1 want to double (Y/N, default N): `);
//             if (request[0] == "Y" || request[0] == "y") {
//                 const double = new solana.TransactionInstruction({
//                     programId: program_id,
//                     keys: [
//                         {pubkey: player2.publicKey, isSigner: false, isWritable: false},
//                         {pubkey: game, isSigner: false, isWritable: true},
//                     ],
//                     data: buffer.Buffer.from([2])
//                 });
//                 await retry(new solana.Transaction().add(double), 1);
//                 console.log("player 1 wants to double");
//                 const reply = readline.question(`Do player -1 accept to double (Y/N, default N): `);
//                 if (reply[0] == "Y" || reply[0] == "y") {
//                     const accept = new solana.TransactionInstruction({
//                         programId: program_id,
//                         keys: [
//                             {pubkey: player1.publicKey, isSigner: false, isWritable: false},
//                             {pubkey: game, isSigner: false, isWritable: true},
//                         ],
//                         data: buffer.Buffer.from([3, 1])
//                     });
//                     await retry(new solana.Transaction().add(accept), -1);
//                     console.log("player -1 accepts");
//                     let game_info = await getInfo(game, 1);
//                     multiplier = game_info.data[77];
//                     display();
//                 } else {
//                     const accept = new solana.TransactionInstruction({
//                         programId: program_id,
//                         keys: [
//                             {pubkey: player1.publicKey, isSigner: false, isWritable: false},
//                             {pubkey: game, isSigner: false, isWritable: true},
//                         ],
//                         data: buffer.Buffer.from([3, 0])
//                     });
//                     await retry(new solana.Transaction().add(accept), -1);
//                     console.log("player -1 refuses");
//                 }
//             }
//         }

//         if (turn === -1) {
//             let roll = new solana.TransactionInstruction({
//                 programId: program_id,
//                 keys: [
//                     {pubkey: player1.publicKey, isSigner: false, isWritable: false},
//                     {pubkey: game, isSigner: false, isWritable: true}
//                 ],
//                 data: buffer.Buffer.from([1])
                
//             });
//             await retry(new solana.Transaction().add(roll), -1);
//             console.log("rolliing dices");
//             let game_info = await getInfo(game, -1);
//             dice[0] = game_info.data[75];
//             dice[1] = game_info.data[76];
//         } else {
//             let roll = new solana.TransactionInstruction({
//                 programId: program_id,
//                 keys: [
//                     {pubkey: player2.publicKey, isSigner: false, isWritable: false},
//                     {pubkey: game, isSigner: false, isWritable: true}
//                 ],
//                 data: buffer.Buffer.from([1])
                
//             });
//             await retry(new solana.Transaction().add(roll), 1);
//             console.log("rolliing dices");
//             let game_info = await getInfo(game, 1);
//             dice[0] = game_info.data[75];
//             dice[1] = game_info.data[76];
//         }
//     }
})();