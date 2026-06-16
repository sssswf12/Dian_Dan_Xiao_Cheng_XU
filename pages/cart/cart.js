const config = require('../../config/index');
const accountService = require('../../utils/account-service');
const cartStore = require('../../utils/cart');
const orderService = require('../../utils/order-service');

Page({
  data: {
    shop: config.SHOP,
    currentUser: null,
    cart: cartStore.getCart(),
    diningTypes: ['家里吃', '带走', '先备着'],
    diningTypeIndex: 0,
    location: '',
    remark: '',
    submitting: false,
  },

  onShow() {
    const currentAdmin = accountService.getAdminSession();
    const currentUser = accountService.getCurrentUser();

    if (currentAdmin) {
      wx.reLaunch({
        url: '/pages/admin/admin',
      });
      return;
    }

    if (!currentUser) {
      wx.reLaunch({
        url: '/pages/account/account',
      });
      return;
    }

    this.setData({
      currentUser: currentUser,
    });
    this.refreshCart();
  },

  refreshCart() {
    this.setData({
      cart: cartStore.getCart(),
    });
  },

  increaseItem(event) {
    const item = this.data.cart.items[event.currentTarget.dataset.index];
    cartStore.addItem(item);
    this.refreshCart();
  },

  decreaseItem(event) {
    cartStore.decreaseItem(event.currentTarget.dataset.id);
    this.refreshCart();
  },

  clearCart() {
    wx.showModal({
      title: '清空已选内容',
      content: '确定要清空已选内容吗？',
      confirmColor: '#ff7f7f',
      success: (result) => {
        if (!result.confirm) {
          return;
        }

        cartStore.clearCart();
        this.refreshCart();
      },
    });
  },

  onDiningTypeChange(event) {
    this.setData({
      diningTypeIndex: Number(event.detail.value || 0),
    });
  },

  onLocationInput(event) {
    this.setData({
      location: event.detail.value,
    });
  },

  onRemarkInput(event) {
    this.setData({
      remark: event.detail.value,
    });
  },

  submitOrder() {
    if (this.data.submitting) {
      return;
    }

    const currentUser = accountService.getCurrentUser();
    const cart = cartStore.getCart();

    if (!currentUser) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
      setTimeout(function goLogin() {
        wx.reLaunch({
          url: '/pages/account/account',
        });
      }, 300);
      return;
    }

    if (!cart.totalCount) {
      wx.showToast({
        title: '还没有选择内容',
        icon: 'none',
      });
      return;
    }

    this.setData({
      submitting: true,
    });
    wx.showLoading({
      title: '提交中',
      mask: true,
    });

    orderService
      .createOrder({
        user: currentUser,
        items: cart.items,
        diningType: this.data.diningTypes[this.data.diningTypeIndex],
        location: this.data.location,
        remark: this.data.remark,
      })
      .then(() => {
        cartStore.clearCart();
        wx.hideLoading();
        wx.showToast({
          title: '订单已发送',
          icon: 'success',
        });

        setTimeout(function redirectToOrders() {
          wx.reLaunch({
            url: '/pages/orders/orders',
          });
        }, 500);
      })
      .catch((error) => {
        wx.hideLoading();
        wx.showToast({
          title: error.message || '提交失败',
          icon: 'none',
        });
      })
      .finally(() => {
        this.setData({
          submitting: false,
        });
      });
  },

  goProfile() {
    wx.reLaunch({
      url: '/pages/account/account',
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

});
