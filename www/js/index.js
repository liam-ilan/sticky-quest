/* global blockLike, window */

/* setup */
window.document.body.style.display = 'none';

// 400 is the designed width
// 640 is the designed height
// we zoom the design to fit the screen in both width and height
// the zoom will 'go as far as possible' in either width or height.
const ratio = Math.min((window.innerWidth / 400), (window.innerHeight / 640));
window.document.body.style.zoom = `${ratio * 100}%`;

// after zooming we center vertically.
// we add margin only if the height is still bigger than the zoomed height.
const paddingTop = ((window.innerHeight - (640 * ratio)) / 2);
if (paddingTop > 0) {
  window.document.body.style.paddingTop = `${paddingTop}px`;
}

// stage
const stage = new blockLike.Stage({
  width: 360,
  height: 240,
  parent: window.document.getElementById('game-box'),
});

stage.pars = [1, 4, 7, 7, 5, 13, 12, 11, 11, 9, 13, 13, 13, 15, 11, 13, 14, 13, 13, 15]; // eslint-disable-line max-len
stage.highestLevel = stage.pars.length;
stage.sounds = {
  hitWall: './sound/hit.wav',
  leaveWall: './sound/leave.wav',
  finishLevel: './sound/forward.wav',
  backLevel: './sound/back.wav',
  finishAll: './sound/finish.wav',
};

/*
* add backdrops assumes image is named {number}.png (i.e. 13.png)
*/
for (let i = 0; i < stage.pars.length + 1; i += 1) {
  stage.addBackdrop(new blockLike.Backdrop({ image: `./img/worlds/${i + 1}.png` }));
}

// controls
const controlStage = new blockLike.Stage({
  width: 360,
  height: 360,
  parent: window.document.getElementById('controls'),
});

  // scoreDisplay
const scoreDisplay = new blockLike.Sprite({
  costume: new blockLike.Costume({
    width: controlStage.width,
    height: 60,
  }),
});

scoreDisplay.addTo(controlStage);
scoreDisplay.goTo(0, 140);
scoreDisplay.addClass('score');

// keys
const keys = [
  new blockLike.Sprite('./img/key.png'),
  new blockLike.Sprite('./img/key.png'),
  new blockLike.Sprite('./img/key.png'),
  new blockLike.Sprite('./img/key.png'),
];

keys.forEach((item, i) => {
  item.setSize(50);
  item.addTo(controlStage);
  item.pointInDirection(i * 90);
  item.move(50);
  item.changeY(-65);
});

const playAgain = new blockLike.Sprite({
  costume: new blockLike.Costume({
    image: './img/playAgain.png',
    width: 60,
    height: 60,
  }),
});
playAgain.addTo(controlStage);
playAgain.goTo(-130, 60);

// retry level
const retryLevel = new blockLike.Sprite({
  costume: new blockLike.Costume({
    image: './img/retry.png',
    width: 60,
    height: 60,
  }),
});

retryLevel.addTo(controlStage);
retryLevel.goTo(130, 60);

// player
const player = new blockLike.Sprite({
  costume: new blockLike.Costume({
    color: '#4292f4',
    width: 20,
    height: 20,
  }),
});

player.setRotationStyle(2);
player.addTo(stage);
player.maxSpeed = 10;

/* init */

stage.whenLoaded(() => {
  window.document.body.style.display = 'block';
});

function gameGet() {
  return JSON.parse(window.localStorage.getItem('game'));
}

function gameSave(whatToSave) {
  window.localStorage.setItem('game', JSON.stringify(whatToSave));
}

function gameReset() {
  gameSave({
    level: 0,
    scores: [],
  });
}

let game = gameGet();
if (game === null) {
  gameReset();
  game = gameGet();
}

let restarted = false;
let currentScore = 0;

/* score */

function countScore(level) {
  let result = 0;
  for (let i = 0; i < level; i += 1) {
    if (game.scores[i] !== undefined) {
      result += game.scores[i];
    }
  }
  return result;
}

function countPars(level) {
  let result = 0;
  for (let i = 0; i < level; i += 1) {
    if (stage.pars[i] !== undefined) {
      result += stage.pars[i];
    }
  }
  return result;
}

function updateScoreDisplay(state) {
  let output = '';
  let left = '&nbsp;&nbsp;&nbsp;';
  let right = '&nbsp;&nbsp;&nbsp;';
  const isHighestLevel = game.level === stage.highestLevel;

  if (state === 'start') {
    if (isHighestLevel) {
      left = 'WIN&nbsp;&nbsp;&nbsp;';
      if (countScore(game.level) - countPars(game.level) > 0) {
        right = `+${countScore(game.level) - countPars(game.level)}`;
      } else {
        right = '&nbsp;=&nbsp;';
      }
    } else {
      left = `PAR ${stage.pars[game.level]}`;
      if (countScore(game.level) - countPars(game.level) > 0) {
        right = `+${countScore(game.level) - countPars(game.level)}`;
      } else {
        right = '&nbsp;=&nbsp;';
      }
    }
  }
  if (state === 'level') {
    if (isHighestLevel) {
      left = 'WIN&nbsp;&nbsp;&nbsp;';
      if (countScore(game.level) - countPars(game.level) > 0) {
        right = `+${countScore(game.level) - countPars(game.level)}`;
      } else {
        right = '&nbsp;=&nbsp;';
      }
    } else {
      left = `${currentScore}&nbsp;&nbsp;&nbsp;`;
      if (currentScore - stage.pars[game.level] > 0) {
        right = `+${currentScore - stage.pars[game.level]}`;
      } else {
        right = '&nbsp;=&nbsp;';
      }
    }
  }
  output = `${left}&nbsp;&nbsp;${right}`;

  scoreDisplay.inner(output);
}

/* the gameplay */

player.whenReceiveMessage('start_level', () => {
  gameSave(game);

  const myLevel = game.level;

  stage.switchBackdropToNum(myLevel);
  player.goTo(150, -90);

  player.speed = 0;
  player.controlable = true;

  currentScore = 0;
  updateScoreDisplay('start');

  // level loop
  while (game.level === myLevel && !restarted) {
    player.move(player.speed);
    if (player.touchingEdge() === 'left') {
      if (game.level + 1 !== stage.highestLevel) {
        player.playSound(stage.sounds.finishLevel);
        game.scores[game.level] = currentScore;
        game.level += 1;
        player.broadcastMessage('start_level');
      } else {
        player.playSound(stage.sounds.finishAll);
        game.scores[game.level] = currentScore;
        game.level += 1;
        player.broadcastMessage('start_level');
      }
    }
    if (player.touchingEdge() === 'right') {
      player.playSound(stage.sounds.backLevel);
      if (game.level - 1 !== -1) {
        game.level -= 1;
        game.scores[game.level] = 0;
        player.broadcastMessage('start_level');
      }
    }

    if (player.isTouchingBackdropColor('#000000') && !player.isTouchingEdge()) {
      player.playSound(stage.sounds.hitWall);
      while (player.isTouchingBackdropColor('#000000')) {
        this.move(-5);
      }
      player.speed = 0;
      player.controlable = true;
    }
  }

  restarted = false;
});


player.whenLoaded(() => {
  player.broadcastMessage('start_level');
});

// UI button actions

function levelRetry() {
  player.playSound(stage.sounds.backLevel);
  restarted = true;
  player.broadcastMessage('start_level');
}

function gameRetry() {
  player.playSound(stage.sounds.backLevel);
  restarted = true;

  gameReset();
  game = gameGet();

  player.broadcastMessage('start_level');
}

function movement(deg) {
  if (player.touchingBackdropColor().length > 0) {
    if (player.controlable) {
      player.playSound(stage.sounds.leaveWall);
      player.controlable = false;
      player.pointInDirection(deg);
      player.speed = player.maxSpeed;
      currentScore += 1;
      updateScoreDisplay('level');
    }
  }
}

// bind events to UI

if ('ontouchstart' in window.document.body) {
  retryLevel.whenEvent('touchend', () => {
    levelRetry();
    this.setSize(100);
  });
  retryLevel.whenEvent('touchstart', () => {
    this.setSize(90);
  });

  playAgain.whenEvent('touchend', () => {
    this.setSize(100);
    gameRetry();
  });
  playAgain.whenEvent('touchstart', () => {
    this.setSize(90);
  });

  keys.forEach((item) => {
    item.whenEvent('touchend', function () {
      this.setSize(50);
    });
    item.whenEvent('touchstart', function () {
      this.setSize(45);
      movement(this.direction); // the direction of the UI key
    });
  });
} else {
  retryLevel.whenEvent('mouseup', () => {
    levelRetry();
    this.setSize(100);
  });
  retryLevel.whenEvent('mousedown', () => {
    this.setSize(90);
  });

  playAgain.whenEvent('mouseup', () => {
    this.setSize(100);
    gameRetry();
  });
  playAgain.whenEvent('mousedown', () => {
    this.setSize(90);
  });

  player.whenKeyPressed('arrowUp', () => {
    movement(0);
  });
  player.whenKeyPressed('arrowDown', () => {
    movement(180);
  });
  player.whenKeyPressed('arrowRight', () => {
    movement(90);
  });
  player.whenKeyPressed('arrowLeft', () => {
    movement(270);
  });

  keys.forEach((item) => {
    item.whenEvent('mouseup', function () {
      this.setSize(50);
    });
    item.whenEvent('mousedown', function () {
      this.setSize(45);
      movement(this.direction); // the direction of the UI key
    });
  });
}
