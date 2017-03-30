-- CREATE THE USER TABLE IF IT DOES NOT EXIST
CREATE TABLE IF NOT EXISTS users 
(
  email VARCHAR (60) UNIQUE NOT NULL PRIMARY KEY, 
  password VARCHAR (100) NOT NULL,
  lastlogin BIGSERIAL,
  isadmin BOOLEAN
);

-- CREATE THE SESSION TABLE IF IT DOES NOT EXIST
CREATE TABLE IF NOT EXISTS session 
(
  sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  sess json NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

-- CREATE THE GAMES TABLE IF IT DOES NOT EXIST
CREATE TABLE IF NOT EXISTS games
(
  id SERIAL PRIMARY KEY,
  create_date BIGINT,
  is_active BOOLEAN,
  current_player_turn INT
);

-- CREATE THE PLAYERS TABLE IF IT DOES NOT EXIST
CREATE TABLE IF NOT EXISTS players
(
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  user_id VARCHAR (60) REFERENCES users(email) ON DELETE CASCADE,
  bet_placed BIGINT,
  bank_buyin BIGINT
);

-- CREATE THE MESSAGES TABLE IF IT DOES NOT EXIST
CREATE TABLE IF NOT EXISTS messages
(
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  user_id VARCHAR (60) REFERENCES users(email) ON DELETE CASCADE,
  msg TEXT,
  msg_timestamp TIMESTAMP(6)
);

-- CREATE THE GAME_CARDS TABLE IF IT DOES NOT EXIST
CREATE TABLE IF NOT EXISTS game_cards
(
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  user_id VARCHAR (60) REFERENCES users(email) ON DELETE CASCADE,
  rank CHAR(1),
  suit VARCHAR (8)
);
