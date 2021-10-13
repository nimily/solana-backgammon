const readline = require('readline-sync'); 
const solana = require('@solana/web3.js');
const buffer = require('buffer');
const crypt = require('crypto');
const bs58 = require('bs58');

const rpcUrl = "https://api.devnet.solana.com";
let connection = new solana.Connection(rpcUrl, 'confirmed');
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
let myself;
if (secretKey === "1") {
    myself = solana.Keypair.fromSeed(new Uint8Array(32).fill(1));
} else if (secretKey === "2") {
    myself = solana.Keypair.fromSeed(new Uint8Array(32).fill(42));
} else {
    myself = solana.Keypair.fromSecretKey(bs58.decode(secretKey));
}

let order;
let game_id = readline.question("Room key you want to join (default: create room): ");
if (game_id === "") {
    game_id = crypt.randomBytes(8);
    console.log("game key:", bs58.encode(game_id));
    console.log("You are red");
    order = 0;
} else {
    game_id = bs58.decode(game_id);
    console.log("You are green");
    order = 1;
}

let you = readline.question("Player you want to add: ");
if (you === "1") {
    you = solana.Keypair.fromSeed(new Uint8Array(32).fill(1)).publicKey;
} else if (you === "2") {
    you = solana.Keypair.fromSeed(new Uint8Array(32).fill(42)).publicKey;
} else {
    you = new solana.PublicKey(you);
}

let player1;
let player2;
if (order === 0) {
    [player1, player2] = [myself.publicKey, you];
} else {
    [player1, player2] = [you, myself.publicKey];
}

async function retry(transaction) {
    let confirmation;
    try {
        confirmation = await solana.sendAndConfirmTransaction(connection, transaction, [myself]);
    } catch (error) {
        console.log(error.message);
        if (error.message.includes("socket hang up") || error.message.includes("FetchError")) {
            connection = new solana.Connection(rpcUrl, 'confirmed');
            confirmation = await retry(transaction);
            console.log("reconnecting");
        } else {
            throw error;
        }
    }
    return confirmation;
}

async function getInfo(account) {
    let info;
    try {
        info = await connection.getAccountInfo(account);
    } catch (error) {
        console.log(error.message);
        if (error.message.includes("socket hang up") || error.message.includes("FetchError")) {
            connection = new solana.Connection(rpcUrl, 'confirmed');
            info = await getInfo(account);
            console.log("reconnecting");
        } else {
            throw error;
        }
    }
    return info;
}


function display() {
    console.log("=".repeat(100));
    console.log("=".repeat(100));
    const top = 13 + "\t" + 14 + "\t" + 15 + "\t" + 16 + "\t" + 17 + "\t" + 18 + "  |   " + 19 + "\t" + 20 + "\t" + 21 + "\t" + 22 + "\t" + 23 + "\t" + 24 + "\t" + "right" + "\t" + "\t" + "die";
    console.log(top);
    console.log(" ".repeat(44) + "|");
    const sb = board.map(x => (x <= 0 ? "" : "\x1b[32m+") + x + "\x1b[0m").map(x => (x[0] === "-" ? "\x1b[31m" : "") + x);
    const sm = [...midBoard];
    sm[0] = (sm[0] != 0 ? "\x1b[31m-" + sm[0] + "\x1b[0m" : 0);
    sm[1] = (sm[1] != 0 ? "\x1b[32m+" + sm[1] + "\x1b[0m" : 0);
    const sr = [...rightBoard];
    sr[0] = (sr[0] != 0 ? "\x1b[31m-" + sr[0] + "\x1b[0m" : 0);
    sr[1] = (sr[1] != 0 ? "\x1b[32m+" + sr[1] + "\x1b[0m" : 0);
    let prev = (board[17] > 0 ? 1 : 0) + board[17].toString().length;
    const top1 = sb[12] + "\t" + sb[13] + "\t" + sb[14] + "\t" + sb[15] + "\t" + sb[16] + "\t" + sb[17] + " ".repeat(4-prev) + sm[0] + "   " + sb[18] + "\t" + sb[19] + "\t" + sb[20] + "\t" + sb[21] + "\t" + sb[22] + "\t" + sb[23] + "\t" + sr[0] + "\t" + "\t" + dice[0];
    console.log(top1);
    console.log(" ".repeat(44) + "|");
    console.log(" ".repeat(44) + "|");
    console.log("-".repeat(100) + "\t" + "multiplier: " + multiplier);
    console.log(" ".repeat(44) + "|");
    console.log(" ".repeat(44) + "|");
    prev = (board[6] > 0 ? 1 : 0) + board[6].toString().length;
    const bot1 = sb[11] + "\t" + sb[10] + "\t" + sb[9] + "\t" + sb[8] + "\t" + sb[7] + "\t" + sb[6] + " ".repeat(4-prev) + sm[1] + "   " + sb[5] + "\t" + sb[4] + "\t" + sb[3] + "\t" + sb[2] + "\t" + sb[1] + "\t" + sb[0] + "\t" + sr[1] + "\t" + "\t" + dice[1];
    console.log(bot1);
    console.log(" ".repeat(44) + "|");
    const bot = 12 + "\t" + 11 + "\t" + 10 + "\t" + 9 + "\t" + 8 + "\t" + 7 + "   |   " + 6 + "\t" + 5 + "\t" + 4 + "\t" + 3 + "\t" + 2 + "\t" + 1 + "\t" + "right" + "\t" + "\t" + "die";
    console.log(bot);
    console.log("=".repeat(100));
    console.log("=".repeat(100));
};

function checkMove(player, steps) {
    if (player === 0) {
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
    let changed = false;
    const info = data.slice(87, 141);
    if ((info[52] != rightBoard[0]) || (info[53] != rightBoard[1])) {
        console.log("right board changed:", info[52], info[53]);
        rightBoard[0] = info[52];
        rightBoard[1] = info[53];
        changed = true;
    }
    if ((info[1] != midBoard[0]) || (info[51] != midBoard[1])) {
        console.log("mid board changed:", info[1], info[51]);
        midBoard[0] = info[1];
        midBoard[1] = info[51];
        changed = true;
    }
    for (let i = 0; i < 24; ++i) {
        const actual = (info[2+i*2] * 2 - 3) * info[3+i*2];
        if (actual != board[i]) {
            console.log("board changed:", i, actual);
            board[i] = actual;
            changed = true;
        }
    }
    if ((dice[0] != data[75]) || (dice[1] != data[76])) {
        console.log("dice changed:", data[75], data[76]);
        dice[0] = data[75];
        dice[1] = data[76];
        changed = true;
    }
    if (multiplier != data[77]) {
        console.log("multiplier changed:", data[77]);
        multiplier = data[77];
        changed = true;
    }
    return changed;
}

(async () => {

    const [game, game_seed] = await solana.PublicKey.findProgramAddress([player1.toBytes(), player2.toBytes(), game_id], program_id);
    console.log("game pubkey:", game.toBase58());

    let status = 0;
    let turn;
    let game_info;
    while (status != 5) {
        switch (status) {
            case 0:
                if (order === 0) {
                    const initialize = new solana.TransactionInstruction({
                        programId: program_id,
                        keys: [
                            {pubkey: player1, isSigner: false, isWritable: false},
                            {pubkey: player2, isSigner: false, isWritable: false},
                            {pubkey: game, isSigner: false, isWritable: true},
                            {pubkey: system, isSigner: false, isWritable: false},
                            {pubkey: rent, isSigner: false, isWritable: false}
                        ],
                        data: buffer.Buffer.from([0, ...game_id])
                    });
                    await retry(new solana.Transaction().add(initialize));
                    console.log("Initialized");
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                game_info = await getInfo(game);
                if (game_info) {
                    status = game_info.data[8];
                }
                break;
            case 1: 
                if (dice[order] === 0) {
                    console.log("deciding first player");
                    const roll = new solana.TransactionInstruction({
                        programId: program_id,
                        keys: [
                            {pubkey: myself.publicKey, isSigner: false, isWritable: false},
                            {pubkey: game, isSigner: false, isWritable: true}
                        ],
                        data: buffer.Buffer.from([1])
                        
                    });
                    await retry(new solana.Transaction().add(roll));
                    console.log("you rolled");
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                game_info = await getInfo(game);
                if (checkBoard(game_info.data)) {
                    display();
                }
                turn = game_info.data[73] - 1;
                status = game_info.data[8];
                break;
            case 2:
                if (turn === order) {
                    const request = readline.question(`Do you want to double (Y/N, default N): `);
                    if (request[0] === "Y" || request[0] === "y") {
                        const double = new solana.TransactionInstruction({
                            programId: program_id,
                            keys: [
                                {pubkey: myself.publicKey, isSigner: false, isWritable: false},
                                {pubkey: game, isSigner: false, isWritable: true},
                            ],
                            data: buffer.Buffer.from([2])
                        });
                        await retry(new solana.Transaction().add(double));
                        console.log(`you want to double`);
                    } else {
                        const roll = new solana.TransactionInstruction({
                            programId: program_id,
                            keys: [
                                {pubkey: myself.publicKey, isSigner: false, isWritable: false},
                                {pubkey: game, isSigner: false, isWritable: true}
                            ],
                            data: buffer.Buffer.from([1])
                            
                        });
                        await retry(new solana.Transaction().add(roll));
                        console.log(`you rolled dices`);
                    }
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                game_info = await getInfo(game);
                if (checkBoard(game_info.data)) {
                    display();
                }
                status = game_info.data[8];
                break;
            case 4:
                if (turn != order) {
                    const reply = readline.question(`Do you accept to double (Y/N, default N): `);
                    if (reply[0] === "Y" || reply[0] === "y") {
                        const accept = new solana.TransactionInstruction({
                            programId: program_id,
                            keys: [
                                {pubkey: myself.publicKey, isSigner: false, isWritable: false},
                                {pubkey: game, isSigner: false, isWritable: true},
                            ],
                            data: buffer.Buffer.from([3, 1])
                        });
                        await retry(new solana.Transaction().add(accept));
                        console.log(`you accepted`);
                    } else {
                        const accept = new solana.TransactionInstruction({
                            programId: program_id,
                            keys: [
                                {pubkey: myself.publicKey, isSigner: false, isWritable: false},
                                {pubkey: game, isSigner: false, isWritable: true},
                            ],
                            data: buffer.Buffer.from([3, 0])
                        });
                        await retry(new solana.Transaction().add(accept));
                        console.log(`you surrendered`);
                    }
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                game_info = await getInfo(game);
                if (checkBoard(game_info.data)) {
                    display();
                }
                status = game_info.data[8];
                break;
            case 3:
                if (order === turn) {
                    let avail;
                    let checkFirstMove = false;
                    let move_len = 0;
                    let possibility;
                    if (dice[0] === dice[1]) {
                        avail = [...dice, ...dice];
                    } else {
                        avail = [...dice];
                        const maxMove = game_info.data[145];
                        if (maxMove > 0) {
                            checkFirstMove = true;
                            move_len = game_info.data[146];
                            possibility = game_info.data.slice(147, 147 + move_len * 2);
                        }
                    }
                    const actions = Buffer.alloc(8);
                    let action_cnt = 0;
                    while (checkMove(turn, avail)) {
                        if (turn === 0) {
                            if (midBoard[0] > 0) {
                                console.log("Your available moves are", avail);
                                const step = parseInt(readline.question("How many steps do you want to move: "));
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

                                if (checkFirstMove) {
                                    let found = false;
                                    for (let i = 0; i < move_len; ++i) {
                                        if ((possibility[2*i] === 0) && (possibility[2*i+1] === step)) {
                                            found = true;
                                            break;
                                        }
                                    }
                                    if (!found) {
                                        console.log("You should not move this way");
                                        continue;
                                    }
                                }
                                checkFirstMove = false;

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
                                const start = parseInt(readline.question("Which checker do you want to move: "));
                                if (!checkStart(start)) {
                                    continue;
                                }
                                if (board[start-1] >= 0) {
                                    console.log("There is no such checker");
                                    continue;
                                }
                                console.log("Your available moves are", avail);
                                const step = parseInt(readline.question("How many steps do you want to move: "));
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

                                if (checkFirstMove) {
                                    let found = false;
                                    for (let i = 0; i < move_len; ++i) {
                                        if ((possibility[2*i] === start) && (possibility[2*i+1] === step)) {
                                            found = true;
                                            break;
                                        }
                                    }
                                    if (!found) {
                                        console.log("You should not move this way");
                                        continue;
                                    }
                                }
                                checkFirstMove = false;

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

                                if (checkFirstMove) {
                                    let found = false;
                                    for (let i = 0; i < move_len; ++i) {
                                        if ((possibility[2*i] === 25) && (possibility[2*i+1] === step)) {
                                            found = true;
                                            break;
                                        }
                                    }
                                    if (!found) {
                                        console.log("You should not move this way");
                                        continue;
                                    }
                                }
                                checkFirstMove = false;

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
                                const start = parseInt(readline.question("Which checker do you want to move: "));
                                if (!checkStart(start)) {
                                    continue;
                                }
                                if (board[start-1] <= 0) {
                                    console.log("There is no such checker");
                                    continue;
                                }
                                console.log("Your available moves are", avail);
                                const step = parseInt(readline.question("How many steps do you want to move: "));
                                if (!checkStep(step)) {
                                    continue;
                                }
                                if ((start - 1 - step >= 0) && (board[start - 1 - step] < -1)) {
                                    console.log("You can not move here");
                                    continue;
                                }

                                if (checkFirstMove) {
                                    let found = false;
                                    for (let i = 0; i < move_len; ++i) {
                                        if ((possibility[2*i] === start) && (possibility[2*i+1] === step)) {
                                            found = true;
                                            break;
                                        }
                                    }
                                    if (!found) {
                                        console.log("You should not move this way");
                                        continue;
                                    }
                                }
                                checkFirstMove = false;

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
                    const move = new solana.TransactionInstruction({
                        programId: program_id,
                        keys: [
                            {pubkey: myself.publicKey, isSigner: false, isWritable: false},
                            {pubkey: game, isSigner: false, isWritable: true}
                        ],
                        data: buffer.Buffer.from([4, ...actions])
                    });
                    await retry(new solana.Transaction().add(move));
                    console.log("saving moves");
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                game_info = await getInfo(game);
                if (checkBoard(game_info.data)) {
                    display();
                }
                status = game_info.data[8];
                turn = game_info.data[73] - 1;
                break;
        }
    }
    console.log("game finishes");
    const winner = game_info.data[74] - 1;
    if (winner === order) {
        console.log(`You win ${multiplier}`);
    } else {
        console.log(`You lose ${multiplier}`);
    }

})();