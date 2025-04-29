// pages/rank/rank.js
Page({
  data: {
    currentTab: 'friend', // 当前选中的标签页
    rankList: [],         // 排行榜数据
    myRank: 0,            // 我的排名
    myInfo: {             // 我的信息
      score: 0,
      nickname: '我',
      avatar: '',
      dateFormatted: ''
    }
  },

  onLoad() {
    this.loadRankData();
  },
  
  // 加载排行榜数据
  loadRankData() {
    // 获取本地存储的排行榜数据
    let rankList = wx.getStorageSync('rankList') || [];
    
    // 格式化日期
    rankList = rankList.map(item => {
      return {
        ...item,
        dateFormatted: this.formatDate(item.date)
      };
    });
    
    // 获取最高分
    const bestScore = wx.getStorageSync('bestScore') || 0;
    
    // 计算我的排名
    let myRank = '未上榜';
    for (let i = 0; i < rankList.length; i++) {
      if (rankList[i].score === bestScore) {
        myRank = i + 1;
        break;
      }
    }
    
    // 设置我的信息
    const myInfo = {
      score: bestScore,
      nickname: '我',
      avatar: '',
      dateFormatted: rankList.length > 0 && rankList[0].score === bestScore ? rankList[0].dateFormatted : ''
    };
    
    this.setData({
      rankList,
      myRank,
      myInfo
    });
  },
  
  // 格式化日期
  formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },
  
  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
    
    // 在实际应用中，这里会根据不同的标签页加载不同的数据
    // 例如从服务器获取全球排行榜数据
    if (tab === 'global') {
      // 这里模拟全球排行榜数据
      wx.showToast({
        title: '加载全球排行榜',
        icon: 'loading',
        duration: 500
      });
    } else {
      this.loadRankData(); // 重新加载好友排行榜
    }
  },
  
  // 返回游戏
  goBack() {
    wx.navigateBack();
  }
});