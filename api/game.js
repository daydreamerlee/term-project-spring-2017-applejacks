import express from 'express';
import { printlog } from './../utils/helpers';

const router = express.Router();


let gameState = {};
const isArray = (obj) => {
  return obj && obj.constructor.name === 'Array';
};


const normalizeForGameState = (cardObject, gameId) => {
  const userId = cardObject['user_id'];
  const card = {
    value: cardObject.value,
    suit: cardObject.suit,
    clubs: 'C' === cardObject.suit,
    hearts: 'H' === cardObject.suit,
    diamonds: 'D' === cardObject.suit,
    spades: 'S' === cardObject.suit
  };

  if (cardObject.hide) {
    card.hidden = true;
  }


  /*
    gameState: {
      1: {
        3: {
          cards: [
            {
              value: 3,
              suit: 'H',
              hears: true
            },
            {
              value: 'A,
              suit: 'C',
              hears: true
            }
          ],
          total: 0,
          bust: false,
          playerWin: false
        },
        4: {
          cards: [
            {
              value: 3,
              suit: 'H',
              hears: true
            },
            {
              value: 'A,
              suit: 'C',
              hears: true
            }
          ],
          total: 24,
          bust: true,
          playerWin: false
        }
      },
      turns: [player2, player1, player3, player4],
      turnIndex: 1
    }



  */

  if (!gameState[gameId]) {
    gameState[gameId] = {};

    // [player1, player3, player4, player2]
    gameState[gameId].turns = [];
  }

  console.log(gameState);
  if (!gameState[gameId][userId]) {
    gameState[gameId][userId] = {
      cards: [],
      total: 0,
      bust: false,
      playerWin: false
    }
  }

  if (isArray(gameState[gameId][userId].cards) && gameState[gameId][userId].cards.length) {
    gameState[gameId][userId].cards.push(card);
  } else {
    gameState[gameId][userId].cards = [card];
  }
};


// play again
// GET /api/game/:id/playAgain/:playerId
router.get('/:id/playAgain/:userId', (req, res) => {
  const { db, io } = res;
  const { id, userId } = req.params;

  const cachedPlayers = gameState[id].turns.slice();

  gameState[id] = {};
  delete gameState[id].bust;
  delete gameState[id].dealerTotal;
  delete gameState[id].total;
  delete gameState[id].again;
  delete gameState[id].playerWin;

  gameState[id].turnIndex = 0;
  gameState[id].turns = [];
  gameState[id].turns.length = 0;
  gameState[id].turns = cachedPlayers.slice();
  db.resetGameCards(id);

  io.in('game-' + id).emit('PLAYER_PLAY_AGAIN', {});
});


// hit
// GET /api/game/:id/hit/:playerId
router.get('/:id/hit/:userId', (req, res) => {
  const { id, userId } = req.params;
  const { db, io } = res;

  console.log('HIT');

  db.dealUpdate(id, userId, 1)
  .then((card) => {
    let { value } = card[0];

    if (value === 'J' || value === 'Q' || value === 'K') {
      value = 10;
    } else if (value === 'A') {
      value = 11;
    } else {
      value = Number(value);
    }

    gameState[id][userId].total = Number(gameState[id][userId].total) + Number(value);

    if (gameState[id][userId].total > 21) {
      gameState[id][userId].bust = true;
      gameState[id][-1].cards[0].hidden = false;
      gameState[id][-1].cards[1].hidden = false;
    } else {
      gameState[id][userId].bust = false;
    }

    normalizeForGameState(card[0], id);
    io.in('game-' + id).emit('PLAYER_BET', {gameState: gameState});
    io.in('game-' + id).emit('PLAYER_HIT', {gameState: gameState});
  });

  // return the new game state here
  res.json({})
});



// stay
// GET /api/game/:id/stay/:playerId
router.get('/:id/stay/:playerId', (req, res) => {
  const { id, playerId } = req.params;
  const { db, io } = res;

  gameState[id].again = false;
  let dealerTotal = Number(gameState[id].dealerTotal);
  console.log('Current dealer todal is ---->>>' + dealerTotal);
  console.log(gameState[id][-1]);

  gameState[id][-1].cards[0].hidden = false;
  gameState[id][-1].cards[1].hidden = false;

   if (dealerTotal >= 17) {
      console.log('inside');

      if (dealerTotal > 21) {
        gameState[id][playerId].playerWin = true;
      } else if (dealerTotal <= Number(gameState[id][playerId].total)) {
        gameState[id][playerId].playerWin = true;
      } else {
        gameState[id][playerId].playerWin = false;
      }

      io.in('game-' + id).emit('PLAYER_STAY', {gameState: gameState});
    } else  {
      console.log('GRAB ANOTHERRRR');
      db.dealUpdate(id, -1, 1)
      .then((card) => {
        let { value } = card[0];

        normalizeForGameState(card[0], id);

        if (value === 'J' || value === 'Q' || value === 'K') {
          value = 10;
        } else if (value === 'A') {
          value = 11;
        } else {
          value = Number(value);
        }

        gameState[id].dealerTotal = Number(gameState[id].dealerTotal) + Number(value);

        io.in('game-' + id).emit('PLAYER_BET', {gameState: gameState});
        io.in('game-' + id).emit('PLAYER_HIT', {gameState: gameState});

        gameState[id].again = true;
        io.in('game-' + id).emit('PLAYER_STAY', {gameState: gameState});
      });

    }


  // return the new game state here
  res.json({})
});

const idInTurns = (gid, uid) => {
  return gameState[gid].turns.find((id) => {
    return Number(id) === Number(uid);
  });
};


// bet
// POST /api/game/:id/bet/:userId
router.post('/:id/bet/:userId', (req, res) => {
  const { id, userId } = req.params;
  const { db, io } = res;
  const { bet } = req.body;

  db.makeBet(bet, userId, id);

  // get player cards
  db.dealUpdate(id, userId, 2)
  .then((cards) => {
    let total = 0;

    // player
    cards.forEach((card) => {
      let { value } = card;

      normalizeForGameState(card, id);

      if (value === 'J' || value === 'Q' || value === 'K') {
        value = 10;
      } else if (value === 'A') {
        value = 11;
      } else {
        value = Number(value);
      }

      total += value;
      gameState[id][userId].total = total;

    });


    setTimeout(() => {
      // get dealer cards
      db.dealUpdate(id, -1, 2)
      .then((cardsD) => {
        let total = 0;

        // dealer
        cardsD.forEach((cardD, i) => {
          let { value } = cardD;

          if (i === 0) {
            cardD.hide = true;
          }

          normalizeForGameState(cardD, id);

          if (value === 'J' || value === 'Q' || value === 'K') {
            value = 10;
          } else if (value === 'A') {
            value = 11;
          } else {
            value = Number(value);
          }

          console.log('total ' + total);
          total = Number(total) + Number(value);
          gameState[id].dealerTotal = Number(total);
          console.log('\nDEALER TOTAL -> ' + gameState[id].dealerTotal+ '\n');


          console.log(gameState[id]);
          if (gameState[id].turns && gameState[id].turns.length === 0) {
            gameState[id].turns.push(userId);
          } else if (gameState[id].turns && gameState[id].turns.length) {

              // only push userId if turns does not have it anymore
              if (!idInTurns(id, userId)) {
                gameState[id].turns.push(userId);
              }

            // });
          }

          if (!gameState[id].turnIndex) {
            gameState[id].turnIndex = 1;
          } else {
            gameState[id].turnIndex++;
          }
        });



        // lastly, get bank account
        db.getPlayerBank(userId, id)
        .then((result) => {
          console.log(result);
          let bankValue = Number(result['bank_buyin']);
          let debt = false;

          if (bankValue < 0 ) {
            debt = true;
          }

          bankValue = Math.abs(bankValue);
          io.in('game-' + id).emit('PLAYER_BET', {gameState: gameState, bankValue: bankValue});
        });



      })
      .catch((err) => console.log('dealUpdate err', err));
    }, 220); // need to add a timeout so that the update card query does not
      // overlap with the select new cards of the next query.


  })
  .catch((err) => console.log('dealUpdate err', err));

  // return the new game state here
  res.json({});
});


export default router;