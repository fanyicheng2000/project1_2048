// pages/gameover/gameover.js
Page({
  data: {
    score: 0,
    bestScore: 0,
    highestTile: 0,
    isWin: false,
    difficulty: 'medium',
    difficultyLabel: '中等'
  },

  onLoad(options) {
    // 获取传递过来的分数、最高分和难度
    const score = parseInt(options.score || 0);
    const bestScore = parseInt(options.bestScore || 0);
    const difficulty = options.difficulty || 'medium';
    
    // 计算最高方块
    let highestTile = this.calculateHighestTile(score);
    
    // 判断是否获胜（达到2048）
    const isWin = highestTile >= 2048;
    
    // 获取难度标签
    const difficultyLabel = this.getDifficultyLabel(difficulty);
    
    this.setData({
      score,
      bestScore,
      highestTile,
      isWin,
      difficulty,
      difficultyLabel
    });
    
    // 保存分数到排行榜
    this.saveScoreToRank(score, difficulty);
  },
  
  // 获取难度的中文标签
  getDifficultyLabel(difficulty) {
    const difficultyMap = {
      'easy': '简单',
      'medium': '中等',
      'hard': '困难'
    };
    return difficultyMap[difficulty] || '中等';
  },
  
  // 根据分数估算最高方块
  calculateHighestTile(score) {
    if (score >= 20000) return 2048;
    if (score >= 10000) return 1024;
    if (score >= 5000) return 512;
    if (score >= 2500) return 256;
    if (score >= 1200) return 128;
    if (score >= 600) return 64;
    if (score >= 300) return 32;
    if (score >= 100) return 16;
    if (score >= 30) return 8;
    if (score >= 10) return 4;
    return 2;
  },
  
  // 保存分数到排行榜
  saveScoreToRank(score, difficulty) {
    // 获取历史排行榜
    let rankList = wx.getStorageSync('rankList') || [];
    
    // 添加新的分数记录
    rankList.push({
      score: score,
      date: new Date().toISOString(),
      // 实际应用中这里会获取用户的微信信息
      nickname: '玩家',
      avatar: '',
      difficulty: difficulty,
      difficultyLabel: this.getDifficultyLabel(difficulty)
    });
    
    // 按分数从高到低排序
    rankList.sort((a, b) => b.score - a.score);
    
    // 只保留前50名
    if (rankList.length > 50) {
      rankList = rankList.slice(0, 50);
    }
    
    // 保存排行榜
    wx.setStorageSync('rankList', rankList);
  },
  
  // 再玩一次
  playAgain() {
    wx.redirectTo({
      url: '/pages/game/game'
    });
  },
  
  // 分享成绩
  shareScore() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },
  
  // 查看排行榜
  viewRank() {
    wx.navigateTo({
      url: '/pages/rank/rank'
    });
  },
  
  // 分享给朋友
  onShareAppMessage() {
    return {
      title: `我在2048游戏${this.data.difficultyLabel}难度下获得了${this.data.score}分，最高方块是${this.data.highestTile}，快来挑战我吧！`,
      path: '/pages/start/start'
    };
  }
});