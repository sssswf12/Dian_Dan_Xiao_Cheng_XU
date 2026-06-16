const config = require('../../config/index');
const accountService = require('../../utils/account-service');

Page({
  data: {
    shop: config.SHOP,
    currentUser: null,
    currentAdmin: null,
    accountInput: '',
    passwordInput: '',
    loading: false,
  },

  onShow() {
    const currentAdmin = accountService.getAdminSession();

    if (currentAdmin) {
      this.setData({
        currentAdmin: currentAdmin,
        currentUser: null,
      });
      wx.redirectTo({
        url: '/pages/admin/admin',
      });
      return;
    }

    this.setData({
      currentUser: accountService.getCurrentUser(),
      currentAdmin: null,
    });
  },

  onAccountInput(event) {
    this.setData({
      accountInput: event.detail.value,
    });
  },

  onPasswordInput(event) {
    this.setData({
      passwordInput: event.detail.value,
    });
  },

  login() {
    if (this.data.loading) {
      return;
    }

    this.setData({
      loading: true,
    });

    const account = this.data.accountInput;
    const password = this.data.passwordInput;
    const loginPromise = accountService.isAdminCredential(account, password)
      ? accountService.loginAdmin(account, password)
      : accountService.loginUser(account, password);

    loginPromise
      .then((user) => {
        if (user.adminPin) {
          this.setData({
            currentAdmin: user,
            currentUser: null,
            passwordInput: '',
          });
          wx.redirectTo({
            url: '/pages/admin/admin',
          });
          return;
        }

        this.setData({
          currentUser: user,
          currentAdmin: null,
          passwordInput: '',
        });

        wx.redirectTo({
          url: '/pages/menu/menu',
        });
      })
      .catch((error) => {
        wx.showToast({
          title: error.message || '登录失败',
          icon: 'none',
        });
      })
      .finally(() => {
        this.setData({
          loading: false,
        });
      });
  },

  logout() {
    accountService.clearCurrentUser();
    accountService.clearAdminSession();
    this.setData({
      currentUser: null,
      currentAdmin: null,
      accountInput: '',
      passwordInput: '',
    });
    wx.showToast({
      title: '已退出',
      icon: 'none',
    });
  },

  goMenu() {
    wx.reLaunch({
      url: '/pages/menu/menu',
    });
  },

  goOrders() {
    wx.reLaunch({
      url: '/pages/orders/orders',
    });
  },

  goCart() {
    wx.reLaunch({
      url: '/pages/cart/cart',
    });
  },

});
