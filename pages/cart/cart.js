const config = require('../../config/index');
const cartStore = require('../../utils/cart');
const orderService = require('../../utils/order-service');

Page({
  data: {
    shop: config.SHOP,
    cart: cartStore.getCart(),
    diningTypes: ['堂食', '自取'],
    diningTypeIndex: 0,
    tableNo: '',
    remark: '',
    submitting: false,
  },

  onShow() {
    this.refreshCart();
  },

  refreshCart() {
    this.setData({
      cart: cartStore.getCart(),
    });
  },

  increaseItem(event) {
    cartStore.addItem(event.currentTarget.dataset.id);
    this.refreshCart();
  },

  decreaseItem(event) {
    cartStore.decreaseItem(event.currentTarget.dataset.id);
    this.refreshCart();
  },

  clearCart() {
    wx.showModal({
      title: '清空购物车',
      content: '确定要清空已选菜品吗？',
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

  onTableInput(event) {
    this.setData({
      tableNo: event.detail.value,
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

    const cart = cartStore.getCart();
    const tableNo = String(this.data.tableNo || '').trim();

    if (!cart.totalCount) {
      wx.showToast({
        title: '购物车还是空的',
        icon: 'none',
      });
      return;
    }

    if (!tableNo) {
      wx.showToast({
        title: '请填写桌号或姓名',
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
        items: cart.items,
        diningType: this.data.diningTypes[this.data.diningTypeIndex],
        tableNo: tableNo,
        remark: this.data.remark,
      })
      .then(() => {
        cartStore.clearCart();
        wx.hideLoading();
        wx.showToast({
          title: '订单已提交',
          icon: 'success',
        });

        setTimeout(function redirectToOrders() {
          wx.redirectTo({
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

  goMenu() {
    wx.navigateTo({
      url: '/pages/menu/menu',
    });
  },

  goOrders() {
    wx.navigateTo({
      url: '/pages/orders/orders',
    });
  },

  goAdmin() {
    wx.navigateTo({
      url: '/pages/admin/admin',
    });
  },
});
