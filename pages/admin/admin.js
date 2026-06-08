const orderService = require('../../utils/order-service');
const { formatPrice, todayKey } = require('../../utils/format');

const ADMIN_PIN_KEY = 'cute_order_admin_pin_v1';
const STATUS_FILTERS = [
  { id: 'all', name: '全部' },
  { id: 'pending', name: '待确认' },
  { id: 'accepted', name: '制作中' },
  { id: 'ready', name: '可取餐' },
  { id: 'completed', name: '已完成' },
  { id: 'cancelled', name: '已取消' },
];

function getOrderActions(order) {
  if (order.status === 'pending') {
    return [
      { status: 'accepted', text: '接单' },
      { status: 'cancelled', text: '取消', danger: true },
    ];
  }

  if (order.status === 'accepted') {
    return [{ status: 'ready', text: '做好了' }];
  }

  if (order.status === 'ready') {
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
    return order.status === 'accepted' || order.status === 'ready';
  }).length;
  const todayRevenue = orders.reduce(function sumRevenue(sum, order) {
    if (todayKey(order.createdAtMs) !== today || order.status === 'cancelled') {
      return sum;
    }

    return sum + Number(order.totalPrice || 0);
  }, 0);

  return {
    pendingCount: pendingCount,
    activeCount: activeCount,
    todayRevenueText: formatPrice(todayRevenue),
  };
}

Page({
  data: {
    authorized: false,
    adminPin: '',
    pinInput: '',
    activeStatus: 'all',
    statusFilters: STATUS_FILTERS,
    allOrders: [],
    orders: [],
    stats: buildStats([]),
    loading: false,
  },

  onLoad() {
    const savedPin = wx.getStorageSync(ADMIN_PIN_KEY);

    if (!savedPin) {
      return;
    }

    this.setData({
      authorized: true,
      adminPin: savedPin,
      pinInput: savedPin,
    });
    this.loadOrders();
  },

  onShow() {
    if (this.data.authorized) {
      this.loadOrders();
    }
  },

  onPullDownRefresh() {
    if (!this.data.authorized) {
      wx.stopPullDownRefresh();
      return;
    }

    this.loadOrders();
  },

  onPinInput(event) {
    this.setData({
      pinInput: event.detail.value,
    });
  },

  login() {
    const adminPin = String(this.data.pinInput || '').trim();

    if (!adminPin) {
      wx.showToast({
        title: '请输入口令',
        icon: 'none',
      });
      return;
    }

    this.setData({
      adminPin: adminPin,
      authorized: true,
    });
    wx.setStorageSync(ADMIN_PIN_KEY, adminPin);
    this.loadOrders().catch(() => {
      this.logout(false);
    });
  },

  logout(showToast) {
    wx.removeStorageSync(ADMIN_PIN_KEY);
    this.setData({
      authorized: false,
      adminPin: '',
      pinInput: '',
      allOrders: [],
      orders: [],
      stats: buildStats([]),
    });

    if (showToast !== false) {
      wx.showToast({
        title: '已退出',
        icon: 'none',
      });
    }
  },

  loadOrders() {
    this.setData({
      loading: true,
    });

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
      .catch((error) => {
        wx.showToast({
          title: error.message || '加载失败',
          icon: 'none',
        });
        return Promise.reject(error);
      })
      .finally(() => {
        this.setData({
          loading: false,
        });
        wx.stopPullDownRefresh();
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
        this.loadOrders();
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
      '状态：' + order.statusText,
      '位置：' + order.diningType + ' · ' + order.tableNo,
      '菜品：',
    ].concat(
      order.items.map(function mapItem(item) {
        return '- ' + item.name + ' x' + item.quantity + '，¥' + item.subtotalText;
      }),
      ['合计：¥' + order.totalPriceText, order.remark ? '备注：' + order.remark : '备注：无']
    );

    wx.setClipboardData({
      data: lines.join('\n'),
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
});
