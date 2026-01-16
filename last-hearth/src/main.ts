import './style.css';
import Phaser from 'phaser';

class GameScene extends Phaser.Scene {
  // Переменные для игры
  private player!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private monsters!: Phaser.GameObjects.Group;
  private bullets!: Phaser.GameObjects.Group;
  private tavernHP: number = 100;
  private waveNumber: number = 1;
  private score: number = 0;
  private gameOver: boolean = false;
  private lastShotTime: number = 0;
  private shootDelay: number = 250; // 250ms delay between shots

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Загрузка ресурсов
    this.load.image('player', 'assets/player.svg');
    this.load.image('monster', 'assets/monster.svg');
    this.load.image('bullet', 'assets/bullet.svg');
  }

  create() {
    // Загружаем сохраненный прогресс
    this.loadProgress();
    
    // Создание игрока (стрелок в окне)
    this.player = this.physics.add.image(400, 500, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setImmovable(true);
    
    // Настройка клавиш управления
    this.cursors = this.input.keyboard.createCursorKeys();
    
    // Создание группы монстров
    this.monsters = this.physics.add.group();
    
    // Создание группы пуль
    this.bullets = this.physics.add.group();

    // Добавление столкновений
    this.physics.add.overlap(this.bullets, this.monsters, this.hitMonster, undefined, this);
    this.physics.add.overlap(this.player, this.monsters, this.hitTavern, undefined, this);

    // Создание первых монстров
    this.spawnMonsters(5);
    
    // Добавление текста с информацией
    this.add.text(16, 16, 'HP: ' + this.tavernHP, { fontSize: '24px', fill: '#ffffff' });
    this.add.text(16, 48, 'Wave: ' + this.waveNumber, { fontSize: '24px', fill: '#ffffff' });
    this.add.text(16, 80, 'Score: ' + this.score, { fontSize: '24px', fill: '#ffffff' });
    this.add.text(16, 112, 'Monsters: ' + this.monsters.getLength(), { fontSize: '24px', fill: '#ffffff' });
  }

  spawnMonsters(count: number) {
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(50, 750);
      const y = Phaser.Math.Between(50, 200); // Монстры появляются сверху
      
      const monster = this.physics.add.image(x, y, 'monster');
      monster.setBounce(0.2);
      monster.setCollideWorldBounds(true);
      
      // Добавляем физику движения к таверне (к игроку)
      this.physics.add.existing(monster);
      monster.setInteractive();
      
      this.monsters.add(monster);
      
      // Направляем монстра к игроку
      const direction = new Phaser.Math.Vector2(
        this.player.x - monster.x,
        this.player.y - monster.y
      ).normalize();
      
      monster.setVelocity(direction.x * 100, direction.y * 100);
    }
  }

  hitMonster(bullet: Phaser.Types.Physics.Arcade.ImageWithDynamicBody, monster: Phaser.Types.Physics.Arcade.ImageWithDynamicBody) {
    // Уничтожаем пулю и монстра при столкновении
    bullet.destroy();
    monster.destroy();
    
    // Увеличиваем счет
    this.score += 10;
    
    // Проверяем, все ли монстры уничтожены
    if (this.monsters.getLength() === 0) {
      this.nextWave();
    }
  }

  hitTavern(player: Phaser.Types.Physics.Arcade.ImageWithDynamicBody, monster: Phaser.Types.Physics.Arcade.ImageWithDynamicBody) {
    // Уменьшаем HP таверны при контакте с монстром
    monster.destroy();
    this.tavernHP -= 10;
    
    // Обновляем отображение HP
    const hpText = this.children.list.find(obj => obj['text'] && obj['text'].startsWith('HP:')) as Phaser.GameObjects.Text;
    if (hpText) {
      hpText.setText('HP: ' + this.tavernHP);
    }
    
    // Проверяем, закончилась ли игра
    if (this.tavernHP <= 0) {
      this.endGame();
    } else {
      // Спауним нового монстра взамен уничтоженного
      setTimeout(() => {
        this.spawnMonsters(1);
      }, 1000);
    }
  }

  nextWave() {
    this.waveNumber++;
    
    // Обновляем текст волны
    const waveText = this.children.list.find(obj => obj['text'] && obj['text'].startsWith('Wave:')) as Phaser.GameObjects.Text;
    if (waveText) {
      waveText.setText('Wave: ' + this.waveNumber);
    }
    
    // Обновляем текст счета
    const scoreText = this.children.list.find(obj => obj['text'] && obj['text'].startsWith('Score:')) as Phaser.GameObjects.Text;
    if (scoreText) {
      scoreText.setText('Score: ' + this.score);
    }
    
    // Если все монстры убиты, показываем экран рассвета
    if (this.monsters.getLength() === 0) {
      this.showSunriseScreen();
    } else {
      // Спауним больше монстров в следующей волне
      this.spawnMonsters(this.waveNumber * 2);
    }
  }

  showSunriseScreen() {
    // Очищаем всех монстров
    this.monsters.clear(true, true);
    
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
    this.saveProgress();
    
    // Добавляем возможность перейти к следующей волне
    this.input.keyboard.once('keydown-SPACE', () => {
      // Убираем текст рассвета
      sunriseText.destroy();
      scoreText.destroy();
      nextWaveText.destroy();
      
      // Спауним больше монстров в следующей волне
      this.spawnMonsters(this.waveNumber * 2);
    });
  }

  saveProgress() {
    // Сохраняем прогресс в localStorage
    const gameData = {
      score: this.score,
      waveNumber: this.waveNumber,
      tavernHP: this.tavernHP
    };
    
    localStorage.setItem('lastHearthSave', JSON.stringify(gameData));
  }

  loadProgress() {
    // Загружаем сохраненные данные
    const savedData = localStorage.getItem('lastHearthSave');
    
    if (savedData) {
      const gameData = JSON.parse(savedData);
      this.score = gameData.score;
      this.waveNumber = gameData.waveNumber;
      this.tavernHP = gameData.tavernHP;
    }
  }

  endGame() {
    this.gameOver = true;
    
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

  update(time: number, delta: number) {
    if (this.gameOver) return;
    
    // Обновление позиции игрока только по оси X (он сидит в "окне")
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-200);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(200);
    } else {
      this.player.setVelocityX(0);
    }

    // Стрельба по пробелу или клику мыши
    const currentTime = time;
    if ((this.input.activePointer.isDown || this.cursors.space.isDown) && currentTime - this.lastShotTime > this.shootDelay) {
      // Создаем пулю
      const bullet = this.physics.add.image(this.player.x, this.player.y, 'bullet');
      this.bullets.add(bullet);
      
      // Направляем пулю вверх
      bullet.setVelocityY(-300);
      bullet.allowGravity = false;
      
      this.lastShotTime = currentTime;
    }
    
    // Ограничения движения игрока (он должен быть в нижней части экрана)
    if (this.player.y < 450) {
      this.player.setY(450);
    }
    
    // Обновляем монстров
    this.monsters.children.entries.forEach((monster: Phaser.Types.Physics.Arcade.ImageWithDynamicBody) => {
      if (!monster.active) return;
      
      // Направляем монстра к игроку
      const direction = new Phaser.Math.Vector2(
        this.player.x - monster.x,
        this.player.y - monster.y
      ).normalize();
      
      monster.setVelocity(direction.x * 100, direction.y * 100);
    });
    
    // Удаляем пули, которые вышли за границы
    this.bullets.children.entries.forEach((bullet: Phaser.Types.Physics.Arcade.ImageWithDynamicBody) => {
      if (bullet.y < 0) {
        bullet.destroy();
      }
    });
  }
}

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
  scene: GameScene
};

// Создание экземпляра игры
const game = new Phaser.Game(config);