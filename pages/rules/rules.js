// pages/rules/rules.js
Page({
  /**
   * 页面的初始数据
   */
  data: {

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 返回游戏页面
   */
  goBack() {
    wx.navigateBack({
      delta: 1
    });
  }
})