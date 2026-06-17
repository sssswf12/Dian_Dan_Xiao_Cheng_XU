const config = require('../config/index');
const { formatDate, getStatusMeta } = require('./format');

const ORDERS_KEY = 'family_order_orders_v1';

function canUseCloud() {
  return config.USE_CLOUD && wx.cloud && typeof wx.cloud.callFunction === 'function';
}

function createOrderNo() {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  ]
    .map(function mapDatePart(value) {
      return Number(value) < 10 ? '0' + Number(value) : String(value);
    })
    .join('');
  const suffix = Math.floor(Math.random() * 900 + 100);

  return 'F' + stamp + suffix;
}

function getRecordId(order) {
  return order._id || order.id || order.orderId || '';
}

function normalizeStatus(status) {
  if (status === 'accepted' || status === 'ready') {
    return 'confirmed';
  }

  return status || 'pending';
}

function normalizeOrder(order) {
  const status = normalizeStatus(order.status);
  const meta = getStatusMeta(status);
  const items = (order.items || []).map(function normalizeItem(item) {
    return {
      id: item.id,
      name: item.name,
      categoryName: item.categoryName || '',
      unit: item.unit || '份',
      quantity: Number(item.quantity || 0),
    };
  });
  const totalCount = Number(
    order.totalCount ||
      items.reduce(function sumCount(sum, item) {
        return sum + Number(item.quantity || 0);
      }, 0)
  );
  const createdAtMs = Number(order.createdAtMs || order.createdAt || Date.now());
  const location = String(order.location || order.tableNo || '').trim();
  const diningType = order.diningType || '家里吃';
  const locationText = location ? diningType + ' · ' + location : diningType;

  return Object.assign({}, order, {
    id: getRecordId(order),
    recordId: getRecordId(order),
    items: items,
    itemsSummary: items
      .map(function mapSummary(item) {
        return item.name + ' x' + item.quantity;
      })
      .join('、'),
    status: status,
    statusText: meta.text,
    statusClass: meta.className,
    userId: order.userId || '',
    userName: order.userName || '未登录账号',
    diningType: diningType,
    location: location,
    locationText: locationText,
    tableNo: location,
    totalCount: totalCount,
    createdAtMs: createdAtMs,
    createdAtText: order.createdAtText || formatDate(createdAtMs),
    updatedAtText: order.updatedAtText || formatDate(order.updatedAtMs || order.updatedAt || createdAtMs),
  });
}

function readLocalOrders() {
  try {
    const orders = wx.getStorageSync(ORDERS_KEY);
    return Array.isArray(orders) ? orders.map(normalizeOrder) : [];
  } catch (error) {
    return [];
  }
}

function writeLocalOrders(orders) {
  wx.setStorageSync(ORDERS_KEY, orders);
}

function assertAdminPin(adminPin) {
  if (String(adminPin || '') !== String(config.ADMIN_PIN)) {
    throw new Error('管理员密码不正确');
  }
}

function buildOrder(payload) {
  const user = payload.user || {};
  const items = (payload.items || []).map(function mapItem(item) {
    return {
      id: item.id,
      name: item.name,
      categoryName: item.categoryName,
      quantity: Number(item.quantity || 0),
      unit: item.unit,
    };
  });
  const totalCount = items.reduce(function sumCount(sum, item) {
    return sum + item.quantity;
  }, 0);
  const now = Date.now();

  if (!user.id || !user.name) {
    throw new Error('请先登录账号');
  }

  if (!totalCount) {
    throw new Error('订单里没有内容');
  }

  return normalizeOrder({
    id: 'local_' + now + '_' + Math.floor(Math.random() * 1000),
    orderNo: createOrderNo(),
    status: 'pending',
    userId: user.id,
    userName: user.name,
    diningType: payload.diningType || '家里吃',
    location: String(payload.location || '').trim(),
    remark: String(payload.remark || '').trim(),
    items: items,
    totalCount: totalCount,
    createdAtMs: now,
    updatedAtMs: now,
  });
}

function callOrderFunction(action, data) {
  return wx.cloud
    .callFunction({
      name: 'orderService',
      data: Object.assign({ action: action }, data || {}),
    })
    .then(function handleResponse(response) {
      const result = response.result || {};

      if (!result.ok) {
        throw new Error(result.message || '云端订单服务暂不可用');
      }

      return result;
    })
    .catch(function handleCloudError(error) {
      const message = String(error && (error.message || error.errMsg) || '');

      if (/timeout/i.test(message)) {
        throw new Error('云函数调用超时，请检查云函数是否已部署成功后重试');
      }

      throw error;
    });
}

function createOrder(payload) {
  const order = buildOrder(payload);

  if (canUseCloud()) {
    return callOrderFunction('createOrder', { order: order }).then(function mapResult(result) {
      return normalizeOrder(result.order);
    });
  }

  const orders = readLocalOrders();
  orders.unshift(order);
  writeLocalOrders(orders);

  return Promise.resolve(order);
}

function getMyOrders(userId) {
  if (canUseCloud()) {
    return callOrderFunction('getMyOrders', {
      userId: userId,
    }).then(function mapResult(result) {
      return (result.orders || []).map(normalizeOrder);
    });
  }

  return Promise.resolve(
    readLocalOrders().filter(function filterOrder(order) {
      return !userId || order.userId === userId;
    })
  );
}

function listOrders(adminPin, status) {
  if (canUseCloud()) {
    return callOrderFunction('listOrders', {
      adminPin: adminPin,
      status: status || 'all',
    }).then(function mapResult(result) {
      return (result.orders || []).map(normalizeOrder);
    });
  }

  try {
    assertAdminPin(adminPin);
  } catch (error) {
    return Promise.reject(error);
  }

  const orders = readLocalOrders().filter(function filterOrder(order) {
    return !status || status === 'all' || order.status === status;
  });

  return Promise.resolve(orders);
}

function updateOrderStatus(orderId, status, adminPin) {
  if (canUseCloud()) {
    return callOrderFunction('updateStatus', {
      adminPin: adminPin,
      orderId: orderId,
      status: status,
    }).then(function mapResult(result) {
      return normalizeOrder(result.order);
    });
  }

  try {
    assertAdminPin(adminPin);
  } catch (error) {
    return Promise.reject(error);
  }

  const orders = readLocalOrders();
  const now = Date.now();
  const index = orders.findIndex(function findOrder(order) {
    return getRecordId(order) === orderId;
  });

  if (index < 0) {
    return Promise.reject(new Error('没有找到这笔订单'));
  }

  orders[index] = normalizeOrder(
    Object.assign({}, orders[index], {
      status: status,
      updatedAtMs: now,
    })
  );
  writeLocalOrders(orders);

  return Promise.resolve(orders[index]);
}

function cancelMyOrder(orderId, userId) {
  if (canUseCloud()) {
    return callOrderFunction('cancelMyOrder', {
      orderId: orderId,
      userId: userId,
    }).then(function mapResult(result) {
      return normalizeOrder(result.order);
    });
  }

  const orders = readLocalOrders();
  const now = Date.now();
  const index = orders.findIndex(function findOrder(order) {
    return getRecordId(order) === orderId;
  });

  if (index < 0 || (userId && orders[index].userId !== userId)) {
    return Promise.reject(new Error('没有找到这笔订单'));
  }

  if (orders[index].status !== 'pending') {
    return Promise.reject(new Error('订单已确认，不能取消'));
  }

  orders[index] = normalizeOrder(
    Object.assign({}, orders[index], {
      status: 'cancelled',
      updatedAtMs: now,
    })
  );
  writeLocalOrders(orders);

  return Promise.resolve(orders[index]);
}

module.exports = {
  cancelMyOrder,
  createOrder,
  getMyOrders,
  listOrders,
  updateOrderStatus,
};
