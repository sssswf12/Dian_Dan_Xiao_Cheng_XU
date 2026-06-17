const accountService = require('../../utils/account-service');
const orderService = require('../../utils/order-service');
const cartStore = require('../../utils/cart');

Page({
  data: {
    currentUser: null,
    currentAdmin: null,
    orders: [],
    loading: false,
  },

  onShow() {
    const currentAdmin = accountService.getAdminSession();
    const currentUser = accountService.getActiveUser();

    if (!currentUser) {
      wx.reLaunch({
        url: '/pages/account/account',
      });
      return;
    }

    this.setData({
      currentUser: currentUser,
      currentAdmin: currentAdmin,
    });
    this.loadOrders();
  },

  onPullDownRefresh() {
    this.loadOrders();
  },

  loadOrders() {
    const currentUser = accountService.getActiveUser();

    if (!currentUser) {
      this.setData({
        currentUser: null,
        orders: [],
      });
      wx.stopPullDownRefresh();
      return Promise.resolve();
    }

    this.setData({
      loading: true,
      currentUser: currentUser,
    });

    return orderService
      .getMyOrders(currentUser.id)
      .then((orders) => {
        this.setData({
          orders: orders,
        });
      })
      .catch((error) => {
        wx.showToast({
          title: error.message || '订单加载失败',
          icon: 'none',
        });
      })
      .finally(() => {
        this.setData({
          loading: false,
        });
        wx.stopPullDownRefresh();
      });
  },

  cancelOrder(event) {
    const order = this.data.orders[event.currentTarget.dataset.index];
    const currentUser = this.data.currentUser;

    if (!order || !currentUser) {
      return;
    }

    wx.showModal({
      title: '取消订单',
      content: '确定取消这笔待确认订单吗？',
      confirmColor: '#ff7f7f',
      success: (result) => {
        if (!result.confirm) {
          return;
        }

        wx.showLoading({
          title: '处理中',
          mask: true,
        });

        orderService
          .cancelMyOrder(order.recordId, currentUser.id)
          .then(() => {
            wx.hideLoading();
            wx.showToast({
              title: '已取消',
              icon: 'success',
            });
            this.loadOrders();
          })
          .catch((error) => {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '取消失败',
              icon: 'none',
            });
          });
      },
    });
  },

  reorder(event) {
    const order = this.data.orders[event.currentTarget.dataset.index];

    if (!order) {
      return;
    }

    cartStore.fillFromOrder(order.items);
    wx.showToast({
      title: '已放入已选内容',
      icon: 'success',
    });

    setTimeout(function goToCart() {
      wx.reLaunch({
        url: '/pages/cart/cart',
      });
    }, 400);
  },

  goProfile() {
    if (this.data.currentAdmin) {
      this.goAdmin();
      return;
    }

    wx.reLaunch({
      url: '/pages/account/account',
    });
  },

  goAdmin() {
    wx.reLaunch({
      url: '/pages/admin/admin',
    });
  },

  goMenu() {
    wx.reLaunch({
      url: '/pages/menu/menu',
    });
  },

  goCart() {
    wx.reLaunch({
      url: '/pages/cart/cart',
    });
  },

});
