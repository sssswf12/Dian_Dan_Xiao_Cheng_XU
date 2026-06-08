const orderService = require('../../utils/order-service');
const cartStore = require('../../utils/cart');

Page({
  data: {
    orders: [],
    loading: false,
  },

  onShow() {
    this.loadOrders();
  },

  onPullDownRefresh() {
    this.loadOrders();
  },

  loadOrders() {
    this.setData({
      loading: true,
    });

    return orderService
      .getMyOrders()
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

    if (!order) {
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
          .cancelMyOrder(order.recordId)
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
      title: '已放入购物车',
      icon: 'success',
    });

    setTimeout(function goToCart() {
      wx.navigateTo({
        url: '/pages/cart/cart',
      });
    }, 400);
  },

  goMenu() {
    wx.navigateTo({
      url: '/pages/menu/menu',
    });
  },

  goCart() {
    wx.navigateTo({
      url: '/pages/cart/cart',
    });
  },

  goAdmin() {
    wx.navigateTo({
      url: '/pages/admin/admin',
    });
  },
});
