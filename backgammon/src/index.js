import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
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
let myself;
let game;
let game_seed;

let click_cnt = 0;
let click_pos;
let doubled = false;
let status = 0;
let turn;
let game_info;

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

async function getInfo() {
  let info;
  try {
      info = await connection.getAccountInfo(game, "processed");
  } catch (error) {
      console.log(error.message);
      if (error.message.includes("socket hang up") || error.message.includes("FetchError")) {
          connection = new solana.Connection(rpcUrl, 'confirmed');
          info = await getInfo();
          console.log("reconnecting");
      } else {
          throw error;
      }
  }
  return info;
}

function translatePK(pk) {
    if (pk === "1") {
        return solana.Keypair.fromSeed(new Uint8Array(32).fill(1)).publicKey;
    } else if (pk === "2") {
        return solana.Keypair.fromSeed(new Uint8Array(32).fill(42)).publicKey;
    } else {
        return new solana.PublicKey(pk);
    }
}

function translateSK(sk) {
    if (sk === "1") {
        return solana.Keypair.fromSeed(new Uint8Array(32).fill(1));
    } else if (sk === "2") {
        return solana.Keypair.fromSeed(new Uint8Array(32).fill(42));
    } else {
        return solana.Keypair.fromSecretKey(bs58.decode(sk));
    }
}

function checkStep(step) {
  if (step <= 6 && step >= 1) {
      return true;
  }
  alert("step out of boundary");
  return false;
}

function checkStart(start) {
  if (start <= 24 && start >= 1) {
      return true;
  }
  alert("start out of boundary");
  return false;
}

function checkBoard(data) {
  let changed = false;
  const info = data.slice(87, 141);
  if ((info[52] !== rightBoard[0]) || (info[53] !== rightBoard[1])) {
      console.log("right board changed:", info[52], info[53]);
      rightBoard[0] = info[52];
      rightBoard[1] = info[53];
      changed = true;
  }
  if ((info[1] !== midBoard[0]) || (info[51] !== midBoard[1])) {
      console.log("mid board changed:", info[1], info[51]);
      midBoard[0] = info[1];
      midBoard[1] = info[51];
      changed = true;
  }
  for (let i = 0; i < 24; ++i) {
      const actual = (info[2+i*2] * 2 - 3) * info[3+i*2];
      if (actual !== board[i]) {
          console.log("board changed:", i + 1, actual);
          board[i] = actual;
          changed = true;
      }
  }
  if ((dice[0] !== data[75]) || (dice[1] !== data[76])) {
      console.log("dice changed:", data[75], data[76]);
      dice[0] = data[75];
      dice[1] = data[76];
      changed = true;
  }
  if (multiplier !== data[77]) {
      console.log("multiplier changed:", data[77]);
      multiplier = data[77];
      changed = true;
  }
  return changed;
}

function display() {
  for (let i = 0; i < 24; ++i) {
    document.getElementById(`slot${i+1}`).innerText = Math.abs(board[i]);
    if (board[i] > 0) {
      document.getElementById(`slot${i+1}`).style.background = "green";
    } else if (board[i] < 0) {
      document.getElementById(`slot${i+1}`).style.background = "red";
    } else {
      document.getElementById(`slot${i+1}`).style.background = "white";
    }
  }
  document.getElementById(`mid0`).innerText = midBoard[0];
  if (midBoard[0] > 0) {
    document.getElementById(`mid0`).style.background = "red";
  } else {
    document.getElementById(`mid0`).style.background = "white";
  }
  document.getElementById(`mid1`).innerText = midBoard[1];
  if (midBoard[1] > 0) {
    document.getElementById(`mid1`).style.background = "green";
  } else {
    document.getElementById(`mid1`).style.background = "white";
  }
  document.getElementById(`right0`).innerText = rightBoard[0];
  if (rightBoard[0] > 0) {
    document.getElementById(`right0`).style.background = "red";
  } else {
    document.getElementById(`right0`).style.background = "white";
  }
  document.getElementById(`right1`).innerText = rightBoard[1];
  if (rightBoard[1] > 0) {
    document.getElementById(`right1`).style.background = "green";
  } else {
    document.getElementById(`right1`).style.background = "white";
  }
  document.getElementById("dice").textContent = `dice: ${dice[0]}, ${dice[1]}`
  document.getElementById("multiplier").textContent = `multiplier: ${multiplier}`
  if (click_cnt === 1) {
    if (click_pos === 0) {
      document.getElementById(`mid0`).style.background = "blue";
    } else if (click_pos === 25) {
      document.getElementById(`mid1`).style.background = "blue";
    } else {
      document.getElementById(`slot${click_pos}`).style.background = "blue";
    }
  }
}

class Game extends React.Component {
  render() {
    return (
      <div id="game">
        <button id="secret-key" onClick={start}>
          start
        </button>
        <div id="game-key">
          game public key: {game}
        </div>
        <div id="order">
        </div>
        <div id="message">
          Game is not started
        </div>
        <div id="upper">
          <button id="slot13" onClick={move(13)}>
              0
          </button>
          <button id="slot14" onClick={move(14)}>
              0
          </button>
          <button id="slot15" onClick={move(15)}>
              0
          </button>
          <button id="slot16" onClick={move(16)}>
              0
          </button>
          <button id="slot17" onClick={move(17)}>
              0
          </button>
          <button id="slot18" onClick={move(18)}>
              0
          </button>
          <button id="slot19" onClick={move(19)}>
              0
          </button>
          <button id="slot20" onClick={move(20)}>
              0
          </button>
          <button id="slot21" onClick={move(21)}>
              0
          </button>
          <button id="slot22" onClick={move(22)}>
              0
          </button>
          <button id="slot23" onClick={move(23)}>
              0
          </button>
          <button id="slot24" onClick={move(24)}>
              0
          </button>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          <button id="mid1" onClick={move(25)}>
              0
          </button>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          <button id="right0" onClick={move(25)}>
              0
          </button>
        </div>
        <div id="lower">
        <button id="slot12" onClick={move(12)}>
              0
          </button>
          <button id="slot11" onClick={move(11)}>
              0
          </button>
          <button id="slot10" onClick={move(10)}>
              0
          </button>
          <button id="slot9" onClick={move(9)}>
              0
          </button>
          <button id="slot8" onClick={move(8)}>
              0
          </button>
          <button id="slot7" onClick={move(7)}>
              0
          </button>
          <button id="slot6" onClick={move(6)}>
              0
          </button>
          <button id="slot5" onClick={move(5)}>
              0
          </button>
          <button id="slot4" onClick={move(4)}>
              0
          </button>
          <button id="slot3" onClick={move(3)}>
              0
          </button>
          <button id="slot2" onClick={move(2)}>
              0
          </button>
          <button id="slot1" onClick={move(1)}>
              0
          </button>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          <button id="mid0" onClick={move(0)}>
              0
          </button>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          <button id="right1" onClick={move(0)}>
              0
          </button>
        </div>
        <div id="dice">
          dice: {dice[0]}, {dice[1]}
        </div>
        <div id="multiplier">
          multiplier: {multiplier}
        </div>
        <button id="double" onClick={double}>
              double
        </button>
      </div>
    );
  }
}

ReactDOM.render(
  <React.StrictMode>
    <Game />
  </React.StrictMode>,
  document.getElementById('root')
);

async function start() {
    const secretKey = prompt("Please enter your secret key: ");
    myself = translateSK(secretKey);
    console.log(myself.publicKey.toBase58());
    let order;
    let you;
    let game_id = prompt("Room key you want to join (default: create room): ");
    if (game_id === "") {
        game_id = crypt.randomBytes(8);
        you = prompt("Player you want to add: ");
        you = translatePK(you);
        console.log("You are red");
        order = 0;
        document.getElementById('order').textContent = `You are red`;
        [game, game_seed] = await solana.PublicKey.findProgramAddress([myself.publicKey.toBytes(), you.toBytes(), game_id], program_id);
        document.getElementById('game-key').textContent = `game public key: ${game.toBase58()}`;
        console.log("game pubkey:", game.toBase58());
    } else {
        order = 1;
        game = new solana.PublicKey(game_id);
        document.getElementById('game-key').textContent = `game public key: ${game.toBase58()}`;
    }
    while (status !== 5) {
        switch (status) {
            case 0:
                if (order === 0) {
                  document.getElementById("message").textContent = "Initializing the game";
                    const initialize = new solana.TransactionInstruction({
                        programId: program_id,
                        keys: [
                            {pubkey: myself.publicKey, isSigner: false, isWritable: false},
                            {pubkey: you, isSigner: false, isWritable: false},
                            {pubkey: game, isSigner: false, isWritable: true},
                            {pubkey: system, isSigner: false, isWritable: false},
                            {pubkey: rent, isSigner: false, isWritable: false}
                        ],
                        data: buffer.Buffer.from([0, ...game_id])
                    });
                    await retry(new solana.Transaction().add(initialize));
                    console.log("Initialized");
                    document.getElementById("message").textContent = "Initialized";
                } else {
                  await longWait();
                }
                game_info = await getInfo();
                if (game_info) {
                    const white = game_info.data.slice(9, 41);
                    const black = game_info.data.slice(41, 73);
                    if (bs58.encode(white) === myself.publicKey.toBase58()) {
                        order = 0;
                        document.getElementById('order').textContent = `You are red`;
                        console.log("you are red");
                    } else if (bs58.encode(black) === myself.publicKey.toBase58()) {
                        order = 1;
                        document.getElementById('order').textContent = `You are green`;
                        console.log("you are green")
                    }
                    if (checkBoard(game_info.data)) {
                        display();
                    }
                    turn = game_info.data[73] - 1;
                    status = game_info.data[8];
                }
                break;
            case 1: 
                if (dice[order] === 0) {
                    console.log("deciding first player");
                    document.getElementById("message").textContent = "Deciding first player";
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
                    document.getElementById("message").textContent = "You rolled";
                } else {
                    await longWait();
                }
                await syncChain();
                break;
            case 2:
                if (turn === order) {
                    if (doubled) {
                        doubled = false;
                        document.getElementById("double").style.background = "white";
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
                        document.getElementById("message").textContent = "You want to double";
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
                        console.log(`you rolled dice`);
                        document.getElementById("message").textContent = "You rolled dice";
                    }
                } else {
                    await longWait();
                }
                await syncChain();
                break;
            case 4:
                if (turn !== order) {
                    const reply = prompt(`Do you accept to double (Y/N, default Y): `);
                    if (reply === "" || reply[0] === "Y" || reply[0] === "y") {
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
                        document.getElementById("message").textContent = "You accepted double";
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
                        document.getElementById("message").textContent = "You surrendered";
                    }
                } else {
                    await longWait();
                }
                await syncChain();
                break;
            case 3:
                if (order === turn) {
                    let avail;
                    let checkFirstMove = false;
                    let move_len = game_info.data[146];;
                    let possibility = game_info.data.slice(147, 147 + move_len * 2);
                    const maxMove = game_info.data[145];
                    if (dice[0] === dice[1]) {
                        avail = [...dice, ...dice];
                    } else {
                        avail = [...dice];
                        checkFirstMove = true;
                    }
                    const actions = Buffer.alloc(8);
                    let action_cnt = 0;
                    while (action_cnt < maxMove) {
                        if (order === 0) {
                            if (midBoard[0] > 0) {
                                document.getElementById("message").textContent = `Your available moves are ${avail}`;
                                console.log(click_cnt, click_pos);
                                display();
                                await shortWait(1);
                                const start = click_pos;
                                if (start !== 0) {
                                  alert("You should start from middle");
                                  click_cnt = 0;
                                  continue;
                                }
                                display();
                                await shortWait(0);
                                const step = click_pos;
                                if (!checkStep(step)) {
                                    continue;
                                }
                                if (board[step-1] > 1) {
                                    alert("You can not move here");
                                    continue;
                                }
                                let i = avail.indexOf(step);
                                if (i === -1) {
                                    alert("There is no such move");
                                    continue;
                                }

                                if (checkFirstMove && move_len > 0) {
                                    let found = false;
                                    for (let i = 0; i < move_len; ++i) {
                                        if ((possibility[2*i] === 0) && (possibility[2*i+1] === step)) {
                                            found = true;
                                            break;
                                        }
                                    }
                                    if (!found) {
                                        alert("You should not move this way");
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
                                document.getElementById("message").textContent = `Your available moves are ${avail}`;
                                console.log(click_cnt, click_pos);
                                display();
                                await shortWait(1);
                                const start = click_pos;
                                if (!checkStart(start)) {
                                    click_cnt = 0;
                                    continue;
                                }
                                if (board[start-1] >= 0) {
                                    alert("There is no such checker");
                                    click_cnt = 0;
                                    continue;
                                }
                                display();
                                await shortWait(0);
                                const end = click_pos;
                                let step = end - start;
                                if (end === 25) {
                                    let minStep = step + 6;
                                    for (let a of avail) {
                                      if ((a >= step) && (a < minStep)) {
                                        minStep = a;
                                      }
                                    }
                                    step = minStep;
                                } 
                                if (!checkStep(step)) {
                                    continue;
                                }
                                if ((start - 1 + step < 24) && (board[start - 1 + step] > 1)) {
                                    alert("You can not move here");
                                    continue;
                                }
                                let i = avail.indexOf(step);
                                if (i === -1) {
                                    alert("There is no such move");
                                    continue;
                                }

                                if (checkFirstMove && move_len > 0) {
                                    let found = false;
                                    for (let i = 0; i < move_len; ++i) {
                                        if ((possibility[2*i] === start) && (possibility[2*i+1] === step)) {
                                            found = true;
                                            break;
                                        }
                                    }
                                    if (!found) {
                                        alert("You should not move this way");
                                        continue;
                                    }
                                }
                                checkFirstMove = false;

                                if (start + step - 1 >= 24) {
                                    let furthest = 24;
                                    for (let i = 23; i >= 0; --i) {
                                        if (board[i] < 0) {
                                            furthest = i;
                                        }
                                    }
                                    if (furthest < 18) {
                                        alert("You can not bear off");
                                        continue;
                                    }
                                    if ((start !== furthest + 1) && (start + step - 1 !== 24)) {
                                        alert("You can not bear off this one");
                                        continue;
                                    }
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
                                document.getElementById("message").textContent = `Your available moves are ${avail}`;
                                console.log(click_cnt, click_pos);
                                display();
                                await shortWait(1);
                                const start = click_pos;
                                if (start !== 25) {
                                  alert("You should start from middle");
                                  click_cnt = 0;
                                  continue;
                                }
                                display();
                                await shortWait(0);
                                const step = 25 - click_pos;
                                if (!checkStep(step)) {
                                    continue;
                                }
                                if (board[24-step] < -1) {
                                    alert("You can not move here");
                                    continue;
                                }
                                let i = avail.indexOf(step);
                                if (i === -1) {
                                    alert("There is no such move");
                                    continue;
                                }

                                if (checkFirstMove && move_len > 0) {
                                    let found = false;
                                    for (let i = 0; i < move_len; ++i) {
                                        if ((possibility[2*i] === 25) && (possibility[2*i+1] === step)) {
                                            found = true;
                                            break;
                                        }
                                    }
                                    if (!found) {
                                        alert("You should not move this way");
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
                                document.getElementById("message").textContent = `Your available moves are ${avail}`;
                                console.log(click_cnt, click_pos);
                                display();
                                await shortWait(1);
                                const start = click_pos;
                                if (!checkStart(start)) {
                                    click_cnt = 0;
                                    continue;
                                }
                                if (board[start-1] <= 0) {
                                  click_cnt = 0;
                                  alert("There is no such checker");
                                  continue;
                                }
                                display();
                                await shortWait(0);
                                const end = click_pos;
                                let step = start - end;
                                if (end === 0) {
                                    let minStep = step + 6;
                                    for (let a of avail) {
                                      if ((a >= step) && (a < minStep)) {
                                        minStep = a;
                                      }
                                    }
                                    step = minStep;
                                } 
                                
                                if (!checkStep(step)) {
                                    continue;
                                }
                                if ((start - 1 - step >= 0) && (board[start - 1 - step] < -1)) {
                                    alert("You can not move here");
                                    continue;
                                }

                                if (checkFirstMove && move_len > 0) {
                                    let found = false;
                                    for (let i = 0; i < move_len; ++i) {
                                        if ((possibility[2*i] === start) && (possibility[2*i+1] === step)) {
                                            found = true;
                                            break;
                                        }
                                    }
                                    if (!found) {
                                        alert("You should not move this way");
                                        continue;
                                    }
                                }
                                checkFirstMove = false;

                                if (start - step - 1 < 0) {
                                    let furthest = -1;
                                    for (let i = 0; i < 24; ++i) {
                                        if (board[i] > 0) {
                                            furthest = i;
                                        }
                                    }
                                    if (furthest >= 6) {
                                        alert("You can not bear off");
                                        continue;
                                    }
                                    if ((start !== furthest + 1) && (start - step !== 0)) {
                                        alert("You can not bear off this one");
                                        continue;
                                    }
                                }

                                let i = avail.indexOf(step);
                                if (i === -1) {
                                    alert("There is no such move");
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
                    document.getElementById("message").textContent = `Wait for the other player`;
                } else {
                    await longWait();
                }
                await syncChain();
                break;
        }
    }
    console.log("game finishes");
    const winner = game_info.data[74] - 1;
    if (winner === order) {
      document.getElementById("message").textContent = `You win ${multiplier}`;
    } else {
      document.getElementById("message").textContent = `You lose ${multiplier}`;
    }

}

function move(slot) {
  return () => {
    if (status === 3) {
      click_cnt = 1 - click_cnt;
      click_pos = slot;
    } else {
      click_cnt = 0;
    }
    display();
  }
}

function double() {
  doubled = true;
  document.getElementById("double").style.background = "blue";
}

async function longWait() {
  document.getElementById("message").textContent = "Wait for the other player";
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function shortWait(x) {
  while (click_cnt !== x) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function syncChain() {
  game_info = await getInfo();
  if (checkBoard(game_info.data)) {
      display();
  }
  status = game_info.data[8];
  turn = game_info.data[73] - 1;
}