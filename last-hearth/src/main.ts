import './style.css';
import * as Phaser from 'phaser';

// Конфигурация Phaser-игры для MVP
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'app',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

// Создание экземпляра игры
const game = new Phaser.Game(config);

// Переменные для игры
let player: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
let monsters: Phaser.GameObjects.Group;
let bullets: Phaser.GameObjects.Group;
let tavernHP: number = 100;
let waveNumber: number = 1;
let score: number = 0;
let gameOver: boolean = false;
let lastShotTime: number = 0;
let shootDelay: number = 250; // 250ms delay between shots

function preload(this: Phaser.Scene) {
  // Загрузка ресурсов
  this.load.image('player', 'assets/player.svg');
  this.load.image('monster', 'assets/monster.svg');
  this.load.image('bullet', 'assets/bullet.svg');
}

function create(this: Phaser.Scene) {
  // Загружаем сохраненный прогресс
  loadProgress();
  
  // Создание игрока (стрелок в окне)
  player = this.physics.add.image(400, 500, 'player');
  player.setCollideWorldBounds(true);
  player.setImmovable(true);
  
  // Настройка клавиш управления
  cursors = this.input.keyboard.createCursorKeys();
  
  // Создание группы монстров
  monsters = this.physics.add.group();
  
  // Создание группы пуль
  bullets = this.physics.add.group();

  // Добавление столкновений
  this.physics.add.overlap(bullets, monsters, hitMonster, undefined, this);
  this.physics.add.overlap(player, monsters, hitTavern, undefined, this);

  // Создание первых монстров
  spawnMonsters(5);
  
  // Добавление текста с информацией
  this.add.text(16, 16, 'HP: ' + tavernHP, { fontSize: '24px', fill: '#ffffff' });
  this.add.text(16, 48, 'Wave: ' + waveNumber, { fontSize: '24px', fill: '#ffffff' });
  this.add.text(16, 80, 'Score: ' + score, { fontSize: '24px', fill: '#ffffff' });
  this.add.text(16, 112, 'Monsters: ' + monsters.getLength(), { fontSize: '24px', fill: '#ffffff' });
}

function spawnMonsters(count: number) {
  for (let i = 0; i < count; i++) {
    const x = Phaser.Math.Between(50, 750);
    const y = Phaser.Math.Between(50, 200); // Монстры появляются сверху
    
    const monster = this.physics.add.image(x, y, 'monster');
    monster.setBounce(0.2);
    monster.setCollideWorldBounds(true);
    
    // Добавляем физику движения к таверне (к игроку)
    this.physics.add.existing(monster);
    monster.setInteractive();
    
    monsters.add(monster);
    
    // Направляем монстра к игроку
    const direction = new Phaser.Math.Vector2(
      player.x - monster.x,
      player.y - monster.y
    ).normalize();
    
    monster.setVelocity(direction.x * 100, direction.y * 100);
  }
}

function hitMonster(bullet: Phaser.Types.Physics.Arcade.ImageWithDynamicBody, monster: Phaser.Types.Physics.Arcade.ImageWithDynamicBody) {
  // Уничтожаем пулю и монстра при столкновении
  bullet.destroy();
  monster.destroy();
  
  // Увеличиваем счет
  score += 10;
  
  // Проверяем, все ли монстры уничтожены
  if (monsters.getLength() === 0) {
    nextWave();
  }
}

function hitTavern(player: Phaser.Types.Physics.Arcade.ImageWithDynamicBody, monster: Phaser.Types.Physics.Arcade.ImageWithDynamicBody) {
  // Уменьшаем HP таверны при контакте с монстром
  monster.destroy();
  tavernHP -= 10;
  
  // Обновляем отображение HP
  const hpText = this.children.list.find(obj => obj['text'] && obj['text'].startsWith('HP:')) as Phaser.GameObjects.Text;
  if (hpText) {
    hpText.setText('HP: ' + tavernHP);
  }
  
  // Проверяем, закончилась ли игра
  if (tavernHP <= 0) {
    endGame();
  } else {
    // Спауним нового монстра взамен уничтоженного
    setTimeout(() => {
      spawnMonsters(1);
    }, 1000);
  }
}

function nextWave() {
  waveNumber++;
  
  // Обновляем текст волны
  const waveText = this.children.list.find(obj => obj['text'] && obj['text'].startsWith('Wave:')) as Phaser.GameObjects.Text;
  if (waveText) {
    waveText.setText('Wave: ' + waveNumber);
  }
  
  // Обновляем текст счета
  const scoreText = this.children.list.find(obj => obj['text'] && obj['text'].startsWith('Score:')) as Phaser.GameObjects.Text;
  if (scoreText) {
    scoreText.setText('Score: ' + score);
  }
  
  // Если все монстры убиты, показываем экран рассвета
  if (monsters.getLength() === 0) {
    showSunriseScreen();
  } else {
    // Спауним больше монстров в следующей волне
    spawnMonsters(waveNumber * 2);
  }
}

function showSunriseScreen() {
  // Очищаем всех монстров
  monsters.clear(true, true);
  
  // Показываем экран рассвета
  const sunriseText = this.add.text(400, 250, 'РАССВЕТ!', { 
    fontSize: '64px', 
    fill: '#FFD700' 
  }).setOrigin(0.5);
  
  const scoreText = this.add.text(400, 320, `+1 Осколок Света`, { 
    fontSize: '32px', 
    fill: '#FFFFFF' 
  }).setOrigin(0.5);
  
  const nextWaveText = this.add.text(400, 370, 'Нажмите ПРОБЕЛ для продолжения', { 
    fontSize: '24px', 
    fill: '#CCCCCC' 
  }).setOrigin(0.5);
  
  // Сохраняем прогресс
  saveProgress();
  
  // Добавляем возможность перейти к следующей волне
  this.input.keyboard.once('keydown-SPACE', () => {
    // Убираем текст рассвета
    sunriseText.destroy();
    scoreText.destroy();
    nextWaveText.destroy();
    
    // Спауним больше монстров в следующей волне
    spawnMonsters(waveNumber * 2);
  });
}

function saveProgress() {
  // Сохраняем прогресс в localStorage
  const gameData = {
    score: score,
    waveNumber: waveNumber,
    tavernHP: tavernHP
  };
  
  localStorage.setItem('lastHearthSave', JSON.stringify(gameData));
}

function loadProgress() {
  // Загружаем сохраненные данные
  const savedData = localStorage.getItem('lastHearthSave');
  
  if (savedData) {
    const gameData = JSON.parse(savedData);
    score = gameData.score;
    waveNumber = gameData.waveNumber;
    tavernHP = gameData.tavernHP;
  }
}

function endGame() {
  gameOver = true;
  
  // Отображаем экран "рассвета" и сообщение о завершении волны
  const gameOverText = this.add.text(400, 300, 'GAME OVER', { 
    fontSize: '64px', 
    fill: '#ff0000' 
  }).setOrigin(0.5);
  
  const restartText = this.add.text(400, 370, 'Press SPACE to restart', { 
    fontSize: '24px', 
    fill: '#ffffff' 
  }).setOrigin(0.5);
  
  // Добавляем возможность перезапуска
  this.input.keyboard.once('keydown-SPACE', () => {
    this.scene.restart();
  });
}

function update(this: Phaser.Scene) {
  if (gameOver) return;
  
  // Обновление позиции игрока только по оси X (он сидит в "окне")
  if (cursors.left.isDown) {
    player.setVelocityX(-200);
  } else if (cursors.right.isDown) {
    player.setVelocityX(200);
  } else {
    player.setVelocityX(0);
  }

  // Стрельба по пробелу или клику мыши
  const currentTime = this.time.now;
  if ((this.input.activePointer.isDown || cursors.space.isDown) && currentTime - lastShotTime > shootDelay) {
    // Создаем пулю
    const bullet = this.physics.add.image(player.x, player.y, 'bullet');
    bullets.add(bullet);
    
    // Направляем пулю вверх
    bullet.setVelocityY(-300);
    bullet.allowGravity = false;
    
    lastShotTime = currentTime;
  }
  
  // Ограничения движения игрока (он должен быть в нижней части экрана)
  if (player.y < 450) {
    player.setY(450);
  }
  
  // Обновляем монстров
  monsters.children.entries.forEach((monster: Phaser.Types.Physics.Arcade.ImageWithDynamicBody) => {
    if (!monster.active) return;
    
    // Направляем монстра к игроку
    const direction = new Phaser.Math.Vector2(
      player.x - monster.x,
      player.y - monster.y
    ).normalize();
    
    monster.setVelocity(direction.x * 100, direction.y * 100);
  });
  
  // Удаляем пули, которые вышли за границы
  bullets.children.entries.forEach((bullet: Phaser.Types.Physics.Arcade.ImageWithDynamicBody) => {
    if (bullet.y < 0) {
      bullet.destroy();
    }
  });
}
