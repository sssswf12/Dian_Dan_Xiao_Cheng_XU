const accountService = require('../../utils/account-service');
const menuService = require('../../utils/menu-service');
const orderService = require('../../utils/order-service');
const { todayKey } = require('../../utils/format');

const STATUS_FILTERS = [
  { id: 'all', name: '全部' },
  { id: 'pending', name: '待确认' },
  { id: 'confirmed', name: '已确认' },
  { id: 'completed', name: '已完成' },
  { id: 'cancelled', name: '已取消' },
];
const ADMIN_TABS = [
  { id: 'orders', name: '订单' },
  { id: 'menu', name: '菜单' },
  { id: 'users', name: '成员' },
  { id: 'me', name: '我' },
];

function createUserForm() {
  return {
    id: '',
    account: '',
    password: '',
    name: '',
    note: '',
    enabled: true,
    sort: 100,
  };
}

function getOrderActions(order) {
  if (order.status === 'pending') {
    return [
      { status: 'confirmed', text: '确认' },
      { status: 'cancelled', text: '取消', danger: true },
    ];
  }

  if (order.status === 'confirmed') {
    return [{ status: 'completed', text: '完成' }];
  }

  return [];
}

function enhanceOrder(order) {
  return Object.assign({}, order, {
    actions: getOrderActions(order),
  });
}

function buildStats(orders) {
  const today = todayKey();
  const pendingCount = orders.filter(function countPending(order) {
    return order.status === 'pending';
  }).length;
  const activeCount = orders.filter(function countActive(order) {
    return order.status === 'confirmed';
  }).length;
  const todayCount = orders.filter(function countToday(order) {
    return todayKey(order.createdAtMs) === today && order.status !== 'cancelled';
  }).length;

  return {
    pendingCount: pendingCount,
    activeCount: activeCount,
    todayCount: todayCount,
  };
}

function getAdminTabName(tabId) {
  const matched = ADMIN_TABS.find(function findTab(tab) {
    return tab.id === tabId;
  });

  return matched ? matched.name : ADMIN_TABS[0].name;
}

function isAdminTab(tabId) {
  return ADMIN_TABS.some(function matchTab(tab) {
    return tab.id === tabId;
  });
}

Page({
  data: {
    authorized: false,
    currentAdmin: null,
    adminPin: '',
    adminAccountInput: '',
    adminPasswordInput: '',
    activeTab: 'orders',
    activeTabName: getAdminTabName('orders'),
    adminTabs: ADMIN_TABS,
    activeStatus: 'all',
    statusFilters: STATUS_FILTERS,
    allOrders: [],
    orders: [],
    stats: buildStats([]),
    menuItems: [],
    userForm: createUserForm(),
    editingUserId: '',
    users: [],
    loading: false,
  },

  onLoad(options) {
    const tab = options && options.tab;

    if (isAdminTab(tab)) {
      this.setActiveTab(tab);
    }
  },

  onShow() {
    if (this.ensureAdminSession()) {
      this.loadCurrentTab();
    }
  },

  ensureAdminSession() {
    const adminSession = accountService.getAdminSession();

    if (!adminSession) {
      this.setData({
        authorized: false,
        adminPin: '',
        currentAdmin: null,
      });
      wx.reLaunch({
        url: '/pages/account/account',
      });
      return false;
    }

    this.setData({
      authorized: true,
      currentAdmin: adminSession,
      adminPin: adminSession.adminPin,
      adminAccountInput: adminSession.account,
    });
    return true;
  },

  onPullDownRefresh() {
    if (!this.data.authorized) {
      wx.stopPullDownRefresh();
      return;
    }

    this.loadCurrentTab();
  },

  onAdminAccountInput(event) {
    this.setData({
      adminAccountInput: event.detail.value,
    });
  },

  onAdminPasswordInput(event) {
    this.setData({
      adminPasswordInput: event.detail.value,
    });
  },

  login() {
    const account = String(this.data.adminAccountInput || '').trim();
    const password = String(this.data.adminPasswordInput || '').trim();

    if (!account || !password) {
      wx.showToast({
        title: '请输入账号和密码',
        icon: 'none',
      });
      return;
    }

    accountService
      .loginAdmin(account, password)
      .then((session) => {
        this.setData({
          adminPin: session.adminPin,
          authorized: true,
          adminPasswordInput: '',
        });
        this.loadCurrentTab().catch(() => {
          this.logout(false);
        });
      })
      .catch((error) => {
        wx.showToast({
          title: error.message || '登录失败',
          icon: 'none',
        });
      });
  },

  logout(showToast) {
    accountService.clearAdminSession();
    this.setData({
      authorized: false,
      adminPin: '',
      currentAdmin: null,
      adminAccountInput: '',
      adminPasswordInput: '',
      allOrders: [],
      orders: [],
      stats: buildStats([]),
      menuItems: [],
      users: [],
    });

    if (showToast !== false) {
      wx.showToast({
        title: '已退出',
        icon: 'none',
      });
    }

    wx.reLaunch({
      url: '/pages/account/account',
    });
  },

  switchAdminTab(event) {
    const nextTab = this.setActiveTab(event.currentTarget.dataset.tab);
    this.loadCurrentTab(nextTab);
  },

  setActiveTab(tab) {
    const nextTab = isAdminTab(tab) ? tab : 'orders';

    this.setData({
      activeTab: nextTab,
      activeTabName: getAdminTabName(nextTab),
    });
    return nextTab;
  },

  loadCurrentTab(tab) {
    if (!this.data.authorized) {
      return Promise.resolve();
    }

    const activeTab = typeof tab === 'string' ? tab : this.data.activeTab;

    if (activeTab === 'orders') {
      return this.loadOrders().catch(this.handleLoadError);
    }

    if (activeTab === 'menu') {
      return this.loadMenuItems().catch(this.handleLoadError);
    }

    if (activeTab === 'users') {
      return this.loadUsers().catch(this.handleLoadError);
    }

    wx.stopPullDownRefresh();
    return Promise.resolve();
  },

  handleLoadError(error) {
    wx.stopPullDownRefresh();
    wx.showToast({
      title: error.message || '加载失败',
      icon: 'none',
    });
  },

  loadOrders(showLoading) {
    if (showLoading !== false) {
      this.setData({
        loading: true,
      });
    }

    return orderService
      .listOrders(this.data.adminPin, 'all')
      .then((orders) => {
        const enhancedOrders = orders.map(enhanceOrder);

        this.setData({
          allOrders: enhancedOrders,
          stats: buildStats(enhancedOrders),
        });
        this.applyStatusFilter();
      })
      .finally(() => {
        if (showLoading !== false) {
          this.setData({
            loading: false,
          });
          wx.stopPullDownRefresh();
        }
      });
  },

  applyStatusFilter() {
    const activeStatus = this.data.activeStatus;
    const orders = this.data.allOrders.filter(function filterOrder(order) {
      return activeStatus === 'all' || order.status === activeStatus;
    });

    this.setData({
      orders: orders,
    });
  },

  selectStatus(event) {
    this.setData({
      activeStatus: event.currentTarget.dataset.status,
    });
    this.applyStatusFilter();
  },

  updateStatus(event) {
    const orderId = event.currentTarget.dataset.id;
    const status = event.currentTarget.dataset.status;

    wx.showLoading({
      title: '处理中',
      mask: true,
    });

    orderService
      .updateOrderStatus(orderId, status, this.data.adminPin)
      .then(() => {
        wx.hideLoading();
        wx.showToast({
          title: '已更新',
          icon: 'success',
        });
        this.loadOrders(false).catch(this.handleLoadError);
      })
      .catch((error) => {
        wx.hideLoading();
        wx.showToast({
          title: error.message || '更新失败',
          icon: 'none',
        });
      });
  },

  copyOrder(event) {
    const order = this.data.orders[event.currentTarget.dataset.index];

    if (!order) {
      return;
    }

    const lines = [
      '订单号：' + order.orderNo,
      '成员：' + order.userName,
      '状态：' + order.statusText,
      '位置：' + order.locationText,
      '内容：',
    ].concat(
      order.items.map(function mapItem(item) {
        return '- ' + item.name + ' x' + item.quantity + item.unit;
      }),
      ['共计：' + order.totalCount + ' 件', order.remark ? '备注：' + order.remark : '备注：无']
    );

    wx.setClipboardData({
      data: lines.join('\n'),
    });
  },

  loadMenuItems(showLoading) {
    if (showLoading !== false) {
      this.setData({
        loading: true,
      });
    }

    return menuService
      .listMenuItems({ includeHidden: true })
      .then((items) => {
        this.setData({
          menuItems: items,
        });
      })
      .finally(() => {
        if (showLoading !== false) {
          this.setData({
            loading: false,
          });
          wx.stopPullDownRefresh();
        }
      });
  },

  createItem() {
    wx.navigateTo({
      url: '/pages/menu-edit/menu-edit',
    });
  },

  editItem(event) {
    const item = this.data.menuItems[event.currentTarget.dataset.index];

    if (!item) {
      return;
    }

    wx.navigateTo({
      url: '/pages/menu-edit/menu-edit?id=' + encodeURIComponent(item.id),
    });
  },

  toggleItem(event) {
    const item = this.data.menuItems[event.currentTarget.dataset.index];

    if (!item) {
      return;
    }

    menuService
      .toggleMenuItem(item.id, !item.enabled, this.data.adminPin)
      .then(() => {
        wx.showToast({
          title: item.enabled ? '已下架' : '已上架',
          icon: 'success',
        });
        this.loadMenuItems(false).catch(this.handleLoadError);
      })
      .catch((error) => {
        wx.showToast({
          title: error.message || '操作失败',
          icon: 'none',
        });
      });
  },

  loadUsers(showLoading) {
    if (showLoading !== false) {
      this.setData({
        loading: true,
      });
    }

    return accountService
      .listUsers({
        includeDisabled: true,
        adminPin: this.data.adminPin,
      })
      .then((users) => {
        this.setData({
          users: users,
        });
      })
      .finally(() => {
        if (showLoading !== false) {
          this.setData({
            loading: false,
          });
          wx.stopPullDownRefresh();
        }
      });
  },

  onUserInput(event) {
    const field = event.currentTarget.dataset.field;

    this.setData({
      ['userForm.' + field]: event.detail.value,
    });
  },

  onUserEnabledChange(event) {
    this.setData({
      'userForm.enabled': event.detail.value,
    });
  },

  editUser(event) {
    const user = this.data.users[event.currentTarget.dataset.index];

    if (!user) {
      return;
    }

    this.setData({
      editingUserId: user.id,
      userForm: Object.assign({}, user),
      activeTab: 'users',
      activeTabName: getAdminTabName('users'),
    });
  },

  resetUserForm() {
    this.setData({
      editingUserId: '',
      userForm: createUserForm(),
    });
  },

  saveUser() {
    const user = Object.assign({}, this.data.userForm, {
      id: this.data.editingUserId || this.data.userForm.id,
      sort: Number(this.data.userForm.sort || 100),
    });

    wx.showLoading({
      title: '保存中',
      mask: true,
    });

    accountService
      .saveUser(user, this.data.adminPin)
      .then(() => {
        wx.hideLoading();
        wx.showToast({
          title: '已保存',
          icon: 'success',
        });
        this.resetUserForm();
        this.loadUsers(false).catch(this.handleLoadError);
      })
      .catch((error) => {
        wx.hideLoading();
        wx.showToast({
          title: error.message || '保存失败',
          icon: 'none',
        });
      });
  },

  toggleUser(event) {
    const user = this.data.users[event.currentTarget.dataset.index];

    if (!user) {
      return;
    }

    accountService
      .toggleUser(user.id, !user.enabled, this.data.adminPin)
      .then(() => {
        wx.showToast({
          title: user.enabled ? '已停用' : '已启用',
          icon: 'success',
        });
        this.loadUsers(false).catch(this.handleLoadError);
      })
      .catch((error) => {
        wx.showToast({
          title: error.message || '操作失败',
          icon: 'none',
        });
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
