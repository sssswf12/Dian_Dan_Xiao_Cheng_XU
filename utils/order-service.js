const config = require('../config/index');
const { formatDate, formatPrice, getStatusMeta } = require('./format');

const ORDERS_KEY = 'cute_order_orders_v1';

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

  return 'A' + stamp + suffix;
}

function getRecordId(order) {
  return order._id || order.id || order.orderId || '';
}

function normalizeOrder(order) {
  const status = order.status || 'pending';
  const meta = getStatusMeta(status);
  const items = (order.items || []).map(function normalizeItem(item) {
    return Object.assign({}, item, {
      price: Number(item.price || 0),
      priceText: formatPrice(item.price),
      subtotal: Number(item.price || 0) * Number(item.quantity || 0),
      subtotalText: formatPrice(Number(item.price || 0) * Number(item.quantity || 0)),
    });
  });
  const totalPrice = Number(
    order.totalPrice ||
      items.reduce(function sumPrice(sum, item) {
        return sum + item.subtotal;
      }, 0)
  );
  const totalCount = Number(
    order.totalCount ||
      items.reduce(function sumCount(sum, item) {
        return sum + Number(item.quantity || 0);
      }, 0)
  );
  const createdAtMs = Number(order.createdAtMs || order.createdAt || Date.now());

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
    totalCount: totalCount,
    totalPrice: totalPrice,
    totalPriceText: formatPrice(totalPrice),
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
    throw new Error('管理员口令不正确');
  }
}

function buildOrder(payload) {
  const items = (payload.items || []).map(function mapItem(item) {
    return {
      id: item.id,
      name: item.name,
      categoryName: item.categoryName,
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 0),
      unit: item.unit,
    };
  });
  const totalCount = items.reduce(function sumCount(sum, item) {
    return sum + item.quantity;
  }, 0);
  const totalPrice = items.reduce(function sumPrice(sum, item) {
    return sum + item.price * item.quantity;
  }, 0);
  const now = Date.now();

  return normalizeOrder({
    id: 'local_' + now + '_' + Math.floor(Math.random() * 1000),
    orderNo: createOrderNo(),
    status: 'pending',
    diningType: payload.diningType || '堂食',
    tableNo: String(payload.tableNo || '').trim(),
    remark: String(payload.remark || '').trim(),
    items: items,
    totalCount: totalCount,
    totalPrice: totalPrice,
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

function getMyOrders() {
  if (canUseCloud()) {
    return callOrderFunction('getMyOrders').then(function mapResult(result) {
      return (result.orders || []).map(normalizeOrder);
    });
  }

  return Promise.resolve(readLocalOrders());
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

function cancelMyOrder(orderId) {
  if (canUseCloud()) {
    return callOrderFunction('cancelMyOrder', {
      orderId: orderId,
    }).then(function mapResult(result) {
      return normalizeOrder(result.order);
    });
  }

  const orders = readLocalOrders();
  const now = Date.now();
  const index = orders.findIndex(function findOrder(order) {
    return getRecordId(order) === orderId;
  });

  if (index < 0) {
    return Promise.reject(new Error('没有找到这笔订单'));
  }

  if (orders[index].status !== 'pending') {
    return Promise.reject(new Error('订单已开始处理，不能取消'));
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
