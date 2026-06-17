const config = require('../../config/index');
const { CATEGORIES } = require('../../utils/menu');
const accountService = require('../../utils/account-service');
const cartStore = require('../../utils/cart');
const menuService = require('../../utils/menu-service');

Page({
  data: {
    shop: config.SHOP,
    currentUser: null,
    currentAdmin: null,
    categories: CATEGORIES,
    activeCategory: 'all',
    keyword: '',
    allItems: [],
    menuList: [],
    cart: cartStore.getCart(),
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
      cart: cartStore.getCart(),
    });
    this.loadMenu();
  },

  loadMenu() {
    this.setData({
      loading: true,
    });

    return menuService
      .listMenuItems()
      .then((items) => {
        this.setData({
          allItems: items,
        });
        this.refreshMenu(cartStore.getCart());
      })
      .catch((error) => {
        wx.showToast({
          title: error.message || '菜单加载失败',
          icon: 'none',
        });
      })
      .finally(() => {
        this.setData({
          loading: false,
        });
      });
  },

  refreshMenu(cart) {
    const nextCart = cart || cartStore.getCart();
    const keyword = String(this.data.keyword || '').trim().toLowerCase();
    const activeCategory = this.data.activeCategory;
    const cartMap = {};

    nextCart.items.forEach(function mapCartItem(item) {
      cartMap[item.id] = item.quantity;
    });

    const menuList = this.data.allItems
      .filter(function filterByCategory(item) {
        return activeCategory === 'all' || item.category === activeCategory;
      })
      .filter(function filterByKeyword(item) {
        if (!keyword) {
          return true;
        }

        return (
          item.name.toLowerCase().indexOf(keyword) >= 0 ||
          item.desc.toLowerCase().indexOf(keyword) >= 0 ||
          item.categoryName.toLowerCase().indexOf(keyword) >= 0 ||
          item.tag.toLowerCase().indexOf(keyword) >= 0
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

  requireUser() {
    if (this.data.currentUser) {
      return true;
    }

    wx.showToast({
      title: '请先登录',
      icon: 'none',
    });
    setTimeout(function goLogin() {
      wx.reLaunch({
        url: '/pages/account/account',
      });
    }, 300);
    return false;
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

  findMenuItem(id) {
    return this.data.allItems.find(function findItem(item) {
      return item.id === id;
    });
  },

  addItem(event) {
    if (!this.requireUser()) {
      return;
    }

    const item = this.findMenuItem(event.currentTarget.dataset.id);
    const cart = cartStore.addItem(item);
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
    if (!this.requireUser()) {
      return;
    }

    if (!this.data.cart.totalCount) {
      wx.showToast({
        title: '先选一点需要的内容',
        icon: 'none',
      });
      return;
    }

    wx.reLaunch({
      url: '/pages/cart/cart',
    });
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

  goOrders() {
    wx.reLaunch({
      url: '/pages/orders/orders',
    });
  },

});
