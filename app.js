const config = require('./config/index');

App({
  globalData: {
    shop: config.SHOP,
    useCloud: config.USE_CLOUD,
  },

  onLaunch() {
    if (!config.USE_CLOUD) {
      return;
    }

    if (!wx.cloud) {
      wx.showModal({
        title: '云开发不可用',
        content: '当前基础库不支持云开发，请升级微信或在开发者工具中调整基础库版本。',
        showCancel: false,
      });
      return;
    }

    wx.cloud.init({
      env: config.CLOUD_ENV_ID,
      traceUser: true,
    });
  },
});
