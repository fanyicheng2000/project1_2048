// pages/game/game.js
Page({
  data: {
    score: 0,          // 当前分数
    bestScore: 0,      // 最高分数
    tiles: [],         // 方块数组
    canUndo: false,    // 是否可以撤销
    previousState: null, // 上一步的游戏状态
    difficulty: 'medium', // 游戏难度：easy, medium, hard
    difficultyOptions: [
      {value: 'easy', label: '简单'},
      {value: 'medium', label: '中等'},
      {value: 'hard', label: '困难'}
    ],
    soundEnabled: true  // 是否启用音效
  },

  onLoad() {
    // 初始化游戏
    
    // 设置触摸事件
    this.startX = 0;
    this.startY = 0;
    this.endX = 0;
    this.endY = 0;
    
    // 加载最高分
    const bestScore = wx.getStorageSync('bestScore') || 0;
    
    // 加载难度设置
    const difficulty = wx.getStorageSync('difficulty') || 'medium';
    
    // 加载音效设置
    const soundEnabled = wx.getStorageSync('soundEnabled');
    // 如果没有保存过音效设置，默认为开启
    const soundSetting = soundEnabled === '' ? true : soundEnabled;
    
    this.setData({ 
      bestScore, 
      difficulty,
      soundEnabled: soundSetting
    });
    
    // 初始化游戏
    this.initGame();
    
    // 初始化音效
    this.initSounds();
  },
  
  // 初始化游戏
  initGame() {
    // 创建一个4x4的空棋盘
    let grid = Array(4).fill(0).map(() => Array(4).fill(0));
    
    // 重置格子ID计数器
    this.nextTileId = 1;
    
    // 随机生成两个初始方块
    this.addRandomTile(grid);
    this.addRandomTile(grid);
    
    // 更新视图
    this.updateView(grid);
    
    // 重置分数
    this.setData({
      score: 0,
      canUndo: false,
      previousState: null
    });
  },
  
  // 添加随机方块
  addRandomTile(grid) {
    // 找出所有空位置
    let emptyCells = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (grid[row][col] === 0) {
          emptyCells.push({ row, col });
        }
      }
    }
    
    // 如果有空位置，随机选一个
    if (emptyCells.length > 0) {
      // 根据难度决定添加几个方块
      const tilesToAdd = this.data.difficulty === 'hard' ? 2 : 1;
      let added = 0;
      
      for (let i = 0; i < tilesToAdd && emptyCells.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * emptyCells.length);
        const cell = emptyCells[randomIndex];
        
        // 根据难度调整2和4的生成概率
        let probability;
        switch (this.data.difficulty) {
          case 'easy':
            probability = 0.95; // 简单模式：95%概率生成2，5%概率生成4
            break;
          case 'medium':
            probability = 0.9; // 中等模式：90%概率生成2，10%概率生成4
            break;
          case 'hard':
            probability = 0.8; // 困难模式：80%概率生成2，20%概率生成4
            break;
          default:
            probability = 0.9;
        }
        
        grid[cell.row][cell.col] = Math.random() < probability ? 2 : 4;
        
        // 标记这个位置为新添加的格子
        if (i === 0) {
          this.newTilePosition = { row: cell.row, col: cell.col };
        }
        
        // 从空位置列表中移除已使用的位置
        emptyCells.splice(randomIndex, 1);
        added++;
      }
      
      return added > 0;
    }
    return false;
  },
  
  // 更新视图
  updateView(grid) {
    // 保存当前的tiles用于比较
    const oldTiles = this.data.tiles || [];
    let tiles = [];
    let nextId = this.nextTileId || 1;
    
    // 创建一个映射来跟踪旧格子的ID和值
    const oldTileMap = {};
    const oldPositionMap = {};
    oldTiles.forEach(tile => {
      // 用于查找特定位置的格子
      oldTileMap[`${tile.row}-${tile.col}`] = tile;
      // 用于通过ID查找格子
      oldPositionMap[tile.id] = { row: tile.row, col: tile.col, value: tile.value };
    });
    
    // 创建一个映射来跟踪已使用的旧格子ID
    const usedIds = {};
    
    // 创建一个映射来跟踪合并的位置
    const mergedPositionsMap = {};
    if (this.mergedPositions && this.mergedPositions.length > 0) {
      this.mergedPositions.forEach(pos => {
        mergedPositionsMap[`${pos.row}-${pos.col}`] = true;
      });
    }
    
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (grid[row][col] !== 0) {
          // 检查这个位置是否有旧的格子
          const oldTileKey = `${row}-${col}`;
          const oldTile = oldTileMap[oldTileKey];
          
          // 检查是否是新添加的格子
          const isNewlyAdded = this.newTilePosition && 
                              this.newTilePosition.row === row && 
                              this.newTilePosition.col === col;
          
          // 检查是否是合并的格子
          const isMerged = mergedPositionsMap[`${row}-${col}`];
          
          // 如果有旧格子且值相同，保留其ID
          if (oldTile && oldTile.value === grid[row][col] && !isNewlyAdded && !isMerged) {
            tiles.push({
              id: oldTile.id,
              value: grid[row][col],
              row: row,
              col: col,
              isNew: false,
              isMerged: false
            });
            usedIds[oldTile.id] = true;
          } else {
            // 尝试查找值相同但位置不同的格子（移动的格子）
            let foundMatchingTile = false;
            
            // 如果是合并的格子，不需要查找匹配的旧格子
            if (!isMerged) {
              for (let i = 0; i < oldTiles.length; i++) {
                const tile = oldTiles[i];
                // 如果找到一个值相同且未被使用的格子，认为它是移动到了新位置
                if (tile.value === grid[row][col] && !usedIds[tile.id] && 
                    (tile.row !== row || tile.col !== col)) {
                  tiles.push({
                    id: tile.id,
                    value: grid[row][col],
                    row: row,
                    col: col,
                    isNew: false,
                    isMerged: false
                  });
                  usedIds[tile.id] = true;
                  foundMatchingTile = true;
                  break;
                }
              }
            }
            
            // 如果没有找到匹配的格子，创建一个新格子
            if (!foundMatchingTile) {
              tiles.push({
                id: nextId++,
                value: grid[row][col],
                row: row,
                col: col,
                isNew: isNewlyAdded, // 只有新添加的格子才标记为isNew
                isMerged: isMerged // 标记合并的格子
              });
            }
          }
        }
      }
    }
    
    this.nextTileId = nextId; // 保存下一个可用的ID
    this.newTilePosition = null; // 重置新格子位置
    this.mergedPositions = []; // 重置合并位置
    this.setData({ tiles });
    this.grid = grid; // 保存当前网格状态
  },
  
  // 处理触摸开始事件
  onTouchStart(e) {
    const touch = e.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
  },
  
  // 处理触摸结束事件
  onTouchEnd(e) {
    const touch = e.changedTouches[0];
    this.endX = touch.clientX;
    this.endY = touch.clientY;
    
    // 计算滑动方向
    const dx = this.endX - this.startX;
    const dy = this.endY - this.startY;
    
    // 确保滑动距离足够长，避免误触
    const minDistance = 30;
    if (Math.abs(dx) < minDistance && Math.abs(dy) < minDistance) {
      return;
    }
    
    // 保存当前状态用于撤销
    this.saveCurrentState();
    
    // 判断滑动方向并移动方块
    if (Math.abs(dx) > Math.abs(dy)) {
      // 水平滑动
      if (dx > 0) {
        this.moveRight();
      } else {
        this.moveLeft();
      }
    } else {
      // 垂直滑动
      if (dy > 0) {
        this.moveDown();
      } else {
        this.moveUp();
      }
    }
  },
  
  // 保存当前状态
  saveCurrentState() {
    const previousState = {
      grid: JSON.parse(JSON.stringify(this.grid)),
      score: this.data.score
    };
    this.setData({ previousState, canUndo: true });
  },
  
  // 向左移动
  moveLeft() {
    let grid = JSON.parse(JSON.stringify(this.grid));
    let moved = false;
    let score = this.data.score;
    let hasMerged = false; // 是否有方块合并
    this.mergedPositions = []; // 记录合并的位置
    
    for (let row = 0; row < 4; row++) {
      let currentRow = grid[row].filter(val => val !== 0); // 移除空格
      let resultRow = [];
      
      // 合并相同数字
      for (let i = 0; i < currentRow.length; i++) {
        if (i < currentRow.length - 1 && currentRow[i] === currentRow[i + 1]) {
          const mergedValue = currentRow[i] * 2;
          resultRow.push(mergedValue);
          score += mergedValue; // 增加分数
          hasMerged = true; // 标记有合并
          // 记录合并位置
          this.mergedPositions.push({ row: row, col: resultRow.length - 1 });
          i++; // 跳过下一个已合并的方块
        } else {
          resultRow.push(currentRow[i]);
        }
      }
      
      // 填充空格
      while (resultRow.length < 4) {
        resultRow.push(0);
      }
      
      // 检查是否有移动
      if (JSON.stringify(grid[row]) !== JSON.stringify(resultRow)) {
        moved = true;
      }
      
      grid[row] = resultRow;
    }
    
    // 如果有合并，播放合并音效
    if (hasMerged) {
      this.playSound('merge');
    }
    
    this.afterMove(grid, moved, score);
  },
  
  // 向右移动
  moveRight() {
    let grid = JSON.parse(JSON.stringify(this.grid));
    let moved = false;
    let score = this.data.score;
    let hasMerged = false; // 是否有方块合并
    this.mergedPositions = []; // 记录合并的位置
    
    for (let row = 0; row < 4; row++) {
      let currentRow = grid[row].filter(val => val !== 0); // 移除空格
      let resultRow = [];
      
      // 合并相同数字（从右向左）
      for (let i = currentRow.length - 1; i >= 0; i--) {
        if (i > 0 && currentRow[i] === currentRow[i - 1]) {
          const mergedValue = currentRow[i] * 2;
          resultRow.unshift(mergedValue);
          score += mergedValue; // 增加分数
          hasMerged = true; // 标记有合并
          // 记录合并位置
          this.mergedPositions.push({ row: row, col: 4 - resultRow.length });
          i--; // 跳过下一个已合并的方块
        } else {
          resultRow.unshift(currentRow[i]);
        }
      }
      
      // 填充空格
      while (resultRow.length < 4) {
        resultRow.unshift(0);
      }
      
      // 检查是否有移动
      if (JSON.stringify(grid[row]) !== JSON.stringify(resultRow)) {
        moved = true;
      }
      
      grid[row] = resultRow;
    }
    
    // 如果有合并，播放合并音效
    if (hasMerged) {
      this.playSound('merge');
    }
    
    this.afterMove(grid, moved, score);
  },
  
  // 向上移动
  moveUp() {
    let grid = JSON.parse(JSON.stringify(this.grid));
    let moved = false;
    let score = this.data.score;
    let hasMerged = false; // 是否有方块合并
    this.mergedPositions = []; // 记录合并的位置
    
    for (let col = 0; col < 4; col++) {
      // 提取当前列
      let currentCol = [];
      for (let row = 0; row < 4; row++) {
        if (grid[row][col] !== 0) {
          currentCol.push(grid[row][col]);
        }
      }
      
      let resultCol = [];
      
      // 合并相同数字
      for (let i = 0; i < currentCol.length; i++) {
        if (i < currentCol.length - 1 && currentCol[i] === currentCol[i + 1]) {
          const mergedValue = currentCol[i] * 2;
          resultCol.push(mergedValue);
          score += mergedValue; // 增加分数
          hasMerged = true; // 标记有合并
          // 记录合并位置
          this.mergedPositions.push({ row: resultCol.length - 1, col: col });
          i++; // 跳过下一个已合并的方块
        } else {
          resultCol.push(currentCol[i]);
        }
      }
      
      // 填充空格
      while (resultCol.length < 4) {
        resultCol.push(0);
      }
      
      // 更新网格并检查是否有移动
      for (let row = 0; row < 4; row++) {
        if (grid[row][col] !== resultCol[row]) {
          moved = true;
        }
        grid[row][col] = resultCol[row];
      }
    }
    
    // 如果有合并，播放合并音效
    if (hasMerged) {
      this.playSound('merge');
    }
    
    this.afterMove(grid, moved, score);
  },
  
  // 向下移动
  moveDown() {
    let grid = JSON.parse(JSON.stringify(this.grid));
    let moved = false;
    let score = this.data.score;
    let hasMerged = false; // 是否有方块合并
    this.mergedPositions = []; // 记录合并的位置
    
    for (let col = 0; col < 4; col++) {
      // 提取当前列
      let currentCol = [];
      for (let row = 0; row < 4; row++) {
        if (grid[row][col] !== 0) {
          currentCol.push(grid[row][col]);
        }
      }
      
      let resultCol = [];
      
      // 合并相同数字（从下向上）
      for (let i = currentCol.length - 1; i >= 0; i--) {
        if (i > 0 && currentCol[i] === currentCol[i - 1]) {
          const mergedValue = currentCol[i] * 2;
          resultCol.unshift(mergedValue);
          score += mergedValue; // 增加分数
          hasMerged = true; // 标记有合并
          // 记录合并位置
          this.mergedPositions.push({ row: 4 - resultCol.length, col: col });
          i--; // 跳过下一个已合并的方块
        } else {
          resultCol.unshift(currentCol[i]);
        }
      }
      
      // 填充空格
      while (resultCol.length < 4) {
        resultCol.unshift(0);
      }
      
      // 更新网格并检查是否有移动
      for (let row = 0; row < 4; row++) {
        if (grid[row][col] !== resultCol[row]) {
          moved = true;
        }
        grid[row][col] = resultCol[row];
      }
    }
    
    // 如果有合并，播放合并音效
    if (hasMerged) {
      this.playSound('merge');
    }
    
    this.afterMove(grid, moved, score);
  },
  
  // 移动后的处理
  afterMove(grid, moved, score) {
    if (moved) {
      // 如果没有合并方块，播放移动音效
      if (!this.mergedPositions || this.mergedPositions.length === 0) {
        this.playSound('move');
      }
      
      // 添加新方块
      this.addRandomTile(grid);
      
      // 更新分数
      this.setData({ score });
      
      // 更新最高分
      if (score > this.data.bestScore) {
        this.setData({ bestScore: score });
        wx.setStorageSync('bestScore', score);
      }
      
      // 更新视图
      this.updateView(grid);
      
      // 检查游戏是否结束
      if (this.isGameOver(grid)) {
        this.gameOver();
      }
      
      // 检查是否达到2048
      this.checkWin(grid);
    }
  },
  
  // 检查游戏是否结束
  isGameOver(grid) {
    // 检查是否有空格
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (grid[row][col] === 0) {
          return false;
        }
      }
    }
    
    // 检查是否有可合并的方块
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const value = grid[row][col];
        
        // 检查右侧
        if (col < 3 && value === grid[row][col + 1]) {
          return false;
        }
        
        // 检查下方
        if (row < 3 && value === grid[row + 1][col]) {
          return false;
        }
      }
    }
    
    return true;
  },
  
  // 检查是否达到2048
  checkWin(grid) {
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (grid[row][col] === 2048) {
          // 播放获胜音效
          this.playSound('win');
          
          wx.showModal({
            title: '恭喜获胜',
            content: '你已经合成了2048！是否继续游戏？',
            confirmText: '继续',
            cancelText: '重新开始',
            success: (res) => {
              if (res.cancel) {
                this.initGame();
              }
            }
          });
          return;
        }
      }
    }
  },
  
  // 游戏结束
  gameOver() {
    // 播放游戏结束音效
    this.playSound('gameover');
    
    // 获取当前难度的中文标签
    const difficultyLabel = this.getDifficultyLabel(this.data.difficulty);
    
    // 显示游戏结束提示框
    wx.showModal({
      title: '游戏结束',
      content: `你在${difficultyLabel}难度下获得了${this.data.score}分！没有可移动的方块了。`,
      confirmText: '查看结果',
      cancelText: '再玩一次',
      success: (res) => {
        if (res.confirm) {
          // 跳转到游戏结束页面
          wx.navigateTo({
            url: `/pages/gameover/gameover?score=${this.data.score}&bestScore=${this.data.bestScore}&difficulty=${this.data.difficulty}`
          });
        } else {
          // 重新开始游戏
          this.initGame();
        }
      }
    });
  },
  
  // 重新开始游戏
  restartGame() {
    this.initGame();
  },
  
  // 撤销上一步
  undoMove() {
    // 困难模式下不允许撤销
    if (this.data.difficulty === 'hard') {
      wx.showToast({
        title: '困难模式下不能撤销',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    if (this.data.canUndo && this.data.previousState) {
      this.grid = this.data.previousState.grid;
      // 在撤销时不标记任何格子为新格子
      this.newTilePosition = null;
      this.updateView(this.grid);
      this.setData({
        score: this.data.previousState.score,
        canUndo: false,
        previousState: null
      });
    }
  },
  
  // 显示游戏规则
  showRules() {
    wx.navigateTo({
      url: '/pages/rules/rules'
    });
  },
  
  // 显示排行榜
  showRank() {
    wx.navigateTo({
      url: '/pages/rank/rank'
    });
  },
  
  // 分享游戏
  shareGame() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },
  
  // 切换难度
  changeDifficulty(e) {
    const difficulty = e.currentTarget.dataset.difficulty;
    this.setData({ difficulty });
    
    // 保存难度设置
    wx.setStorageSync('difficulty', difficulty);
    
    // 不再重新开始游戏，只更新难度设置
    // this.initGame();
    
    // 显示提示
    wx.showToast({
      title: `已切换至${this.getDifficultyLabel(difficulty)}模式`,
      icon: 'none',
      duration: 1500
    });
  },
  
  // 切换音效设置
  toggleSoundSetting() {
    const newSetting = !this.data.soundEnabled;
    this.setData({ soundEnabled: newSetting });
    
    // 保存音效设置
    wx.setStorageSync('soundEnabled', newSetting);
    
    // 显示提示
    wx.showToast({
      title: newSetting ? '已开启音效' : '已关闭音效',
      icon: 'none',
      duration: 1500
    });
  },
  
  // 获取难度的中文标签
  getDifficultyLabel(difficulty) {
    const option = this.data.difficultyOptions.find(opt => opt.value === difficulty);
    return option ? option.label : '中等';
  },
  
  // 分享给朋友
  onShareAppMessage() {
    return {
      title: `我在2048游戏${this.getDifficultyLabel(this.data.difficulty)}难度下获得了${this.data.score}分，快来挑战我吧！`,
      path: '/pages/start/start'
    };
  },
  
  // 初始化音效
  initSounds() {
    try {
      // 创建所有音效实例
      this.mergeSound = wx.createInnerAudioContext();
      this.moveSound = wx.createInnerAudioContext();
      this.winSound = wx.createInnerAudioContext();
      this.gameoverSound = wx.createInnerAudioContext();

      // 设置音效文件路径
      const soundBasePath = 'assets/sounds/';
      this.mergeSound.src = soundBasePath + 'merge.wav';
      this.moveSound.src = soundBasePath + 'move.wav';
      this.winSound.src = soundBasePath + 'win.mp3';
      this.gameoverSound.src = soundBasePath + 'gameover.wav';

      // 统一设置音量
      [this.mergeSound, this.moveSound, this.winSound, this.gameoverSound].forEach(sound => {
        sound.volume = 0.5;
      });
      
      // 添加音效加载失败的事件监听
      this.mergeSound.onError((res) => {
        console.error('合并音效加载失败:', res);
        console.error('错误详情:', res.errMsg);
        console.error('错误码:', res.errCode);
        
        // 显示详细错误信息
        wx.showToast({
          title: '音效加载失败: ' + res.errMsg,
          icon: 'none',
          duration: 2000
        });
      });
      
      // 添加播放成功的事件监听
      this.mergeSound.onPlay(() => {
        console.log('合并音效开始播放');
      });
      
      // 添加音效加载成功的事件监听
      this.mergeSound.onCanplay(() => {
        console.log('合并音效加载成功，路径:', this.mergeSound.src);
        // 预加载完成后，播放一次音效（音量为0）确保后续可以正常播放
        const originalVolume = this.mergeSound.volume;
        this.mergeSound.volume = 0;
        this.mergeSound.play();
        setTimeout(() => {
          this.mergeSound.stop();
          this.mergeSound.volume = originalVolume;
          console.log('预加载音效完成');
        }, 100);
      });
      
      // 初始化其他音效
      this.moveSound = wx.createInnerAudioContext();
      this.moveSound.src = 'assets/sounds/move.wav';
      this.moveSound.volume = 0.3;
      
      this.gameoverSound = wx.createInnerAudioContext();
      this.gameoverSound.src = 'assets/sounds/gameover.wav';
      this.gameoverSound.volume = 0.5;
      
      this.winSound = wx.createInnerAudioContext();
      this.winSound.src = 'assets/sounds/win.mp3';
      this.winSound.volume = 0.5;
      
    } catch (error) {
      console.error('初始化音效失败:', error);
    }
  },
  
  // 播放音效
  playSound(type) {
    if (!this.data.soundEnabled) return;
    
    const soundMap = {
      'merge': this.mergeSound,
      'move': this.moveSound,
      'win': this.winSound,
      'gameover': this.gameoverSound
    };
    
    const sound = soundMap[type];
    if (sound) {
      try {
        sound.stop();
        sound.play();
      } catch (error) {
        console.error(`播放${type}音效失败:`, error);
      }
    }
  },
  
  // 切换音效设置
  toggleSoundSetting() {
    const newSetting = !this.data.soundEnabled;
    this.setData({
      soundEnabled: newSetting
    });
    
    // 保存设置
    wx.setStorageSync('soundEnabled', newSetting);
    
    // 显示提示
    wx.showToast({
      title: newSetting ? '已开启音效' : '已关闭音效',
      icon: 'none',
      duration: 1500
    });
  }
});