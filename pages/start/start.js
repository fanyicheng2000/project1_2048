// pages/start/start.js
Page({
  data: {},

  onLoad() {
    // 2秒后自动跳转到游戏主页面
    setTimeout(() => {
      wx.redirectTo({
        url: '/pages/game/game'
      })
    }, 2000)
  }
})