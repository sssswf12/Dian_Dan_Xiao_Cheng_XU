const config = require('../../config/index');
const { CATEGORIES, MENU_ITEMS } = require('../../utils/menu');
const cartStore = require('../../utils/cart');

Page({
  data: {
    shop: config.SHOP,
    categories: CATEGORIES,
    activeCategory: 'all',
    keyword: '',
    menuList: [],
    cart: cartStore.getCart(),
  },

  onLoad() {
    this.refreshMenu();
  },

  onShow() {
    this.refreshMenu();
  },

  refreshMenu(cart) {
    const nextCart = cart || cartStore.getCart();
    const keyword = String(this.data.keyword || '').trim().toLowerCase();
    const activeCategory = this.data.activeCategory;
    const cartMap = {};

    nextCart.items.forEach(function mapCartItem(item) {
      cartMap[item.id] = item.quantity;
    });

    const menuList = MENU_ITEMS.filter(function filterByCategory(item) {
      return activeCategory === 'all' || item.category === activeCategory;
    })
      .filter(function filterByKeyword(item) {
        if (!keyword) {
          return true;
        }

        return (
          item.name.toLowerCase().indexOf(keyword) >= 0 ||
          item.desc.toLowerCase().indexOf(keyword) >= 0 ||
          item.categoryName.toLowerCase().indexOf(keyword) >= 0
        );
      })
      .map(function attachCount(item) {
        return Object.assign({}, item, {
          count: cartMap[item.id] || 0,
        });
      });

    this.setData({
      cart: nextCart,
      menuList: menuList,
    });
  },

  onSearchInput(event) {
    this.setData({
      keyword: event.detail.value,
    });
    this.refreshMenu();
  },

  selectCategory(event) {
    this.setData({
      activeCategory: event.currentTarget.dataset.id,
    });
    this.refreshMenu();
  },

  addItem(event) {
    const cart = cartStore.addItem(event.currentTarget.dataset.id);
    this.refreshMenu(cart);
  },

  increaseItem(event) {
    this.addItem(event);
  },

  decreaseItem(event) {
    const cart = cartStore.decreaseItem(event.currentTarget.dataset.id);
    this.refreshMenu(cart);
  },

  goCart() {
    if (!this.data.cart.totalCount) {
      wx.showToast({
        title: '先选一点想吃的',
        icon: 'none',
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/cart/cart',
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
