const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const COLLECTION = 'orders';
const ADMIN_PIN = process.env.ADMIN_PIN || '';
const VALID_STATUS = ['pending', 'accepted', 'ready', 'completed', 'cancelled'];

function pad(value) {
  return Number(value) < 10 ? '0' + Number(value) : String(value);
}

function formatDate(input) {
  const date = input ? new Date(input) : new Date();

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    ' ',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('');
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
    .map(pad)
    .join('');
  const suffix = Math.floor(Math.random() * 900 + 100);

  return 'A' + stamp + suffix;
}

function cleanText(value, maxLength) {
  return String(value || '')
    .trim()
    .slice(0, maxLength);
}

function assertAdminPin(pin) {
  if (!ADMIN_PIN) {
    throw new Error('请先配置云函数 ADMIN_PIN 环境变量');
  }

  if (String(pin || '') !== String(ADMIN_PIN)) {
    throw new Error('管理员口令不正确');
  }
}

function sanitizeItems(items) {
  const nextItems = (Array.isArray(items) ? items : [])
    .slice(0, 50)
    .map(function mapItem(item) {
      return {
        id: cleanText(item.id, 40),
        name: cleanText(item.name, 40),
        categoryName: cleanText(item.categoryName, 20),
        unit: cleanText(item.unit, 12),
        price: Math.max(0, parseInt(item.price, 10) || 0),
        quantity: Math.min(99, Math.max(1, parseInt(item.quantity, 10) || 1)),
      };
    })
    .filter(function keepItem(item) {
      return item.id && item.name && item.price >= 0 && item.quantity > 0;
    });

  if (!nextItems.length) {
    throw new Error('订单里没有有效菜品');
  }

  return nextItems;
}

function sanitizeOrder(rawOrder, openid) {
  const items = sanitizeItems(rawOrder.items);
  const tableNo = cleanText(rawOrder.tableNo, 24);
  const diningType = cleanText(rawOrder.diningType, 12) || '堂食';
  const now = Date.now();
  const totalCount = items.reduce(function sumCount(sum, item) {
    return sum + item.quantity;
  }, 0);
  const totalPrice = items.reduce(function sumPrice(sum, item) {
    return sum + item.price * item.quantity;
  }, 0);

  if (!tableNo) {
    throw new Error('请填写桌号或姓名');
  }

  return {
    orderNo: cleanText(rawOrder.orderNo, 32) || createOrderNo(),
    status: 'pending',
    diningType: diningType === '自取' ? '自取' : '堂食',
    tableNo: tableNo,
    remark: cleanText(rawOrder.remark, 120),
    items: items,
    totalCount: totalCount,
    totalPrice: totalPrice,
    openid: openid,
    createdAtMs: now,
    updatedAtMs: now,
    createdAtText: formatDate(now),
    updatedAtText: formatDate(now),
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

async function getOrder(orderId) {
  const result = await db.collection(COLLECTION).doc(orderId).get();
  return result.data;
}

async function createOrder(event, wxContext) {
  const order = sanitizeOrder(event.order || {}, wxContext.OPENID);
  const result = await db.collection(COLLECTION).add({
    data: order,
  });

  return {
    ok: true,
    order: Object.assign({ _id: result._id }, order),
  };
}

async function getMyOrders(wxContext) {
  const result = await db
    .collection(COLLECTION)
    .where({
      openid: wxContext.OPENID,
    })
    .orderBy('createdAtMs', 'desc')
    .limit(50)
    .get();

  return {
    ok: true,
    orders: result.data,
  };
}

async function listOrders(event) {
  assertAdminPin(event.adminPin);

  const status = cleanText(event.status, 20);
  let query = db.collection(COLLECTION);

  if (status && status !== 'all') {
    query = query.where({
      status: status,
    });
  }

  const result = await query.orderBy('createdAtMs', 'desc').limit(100).get();

  return {
    ok: true,
    orders: result.data,
  };
}

async function updateStatus(event) {
  assertAdminPin(event.adminPin);

  const orderId = cleanText(event.orderId, 80);
  const status = cleanText(event.status, 20);

  if (!orderId) {
    throw new Error('缺少订单编号');
  }

  if (VALID_STATUS.indexOf(status) < 0) {
    throw new Error('订单状态不正确');
  }

  const now = Date.now();
  await db
    .collection(COLLECTION)
    .doc(orderId)
    .update({
      data: {
        status: status,
        updatedAtMs: now,
        updatedAtText: formatDate(now),
        updatedAt: new Date(now),
      },
    });

  const order = await getOrder(orderId);

  return {
    ok: true,
    order: order,
  };
}

async function cancelMyOrder(event, wxContext) {
  const orderId = cleanText(event.orderId, 80);

  if (!orderId) {
    throw new Error('缺少订单编号');
  }

  const order = await getOrder(orderId);

  if (!order || order.openid !== wxContext.OPENID) {
    throw new Error('没有找到这笔订单');
  }

  if (order.status !== 'pending') {
    throw new Error('订单已开始处理，不能取消');
  }

  const now = Date.now();
  await db
    .collection(COLLECTION)
    .doc(orderId)
    .update({
      data: {
        status: 'cancelled',
        updatedAtMs: now,
        updatedAtText: formatDate(now),
        updatedAt: new Date(now),
      },
    });

  return {
    ok: true,
    order: Object.assign({}, order, {
      status: 'cancelled',
      updatedAtMs: now,
      updatedAtText: formatDate(now),
      updatedAt: new Date(now),
    }),
  };
}

exports.main = async function main(event) {
  const wxContext = cloud.getWXContext();
  const payload = event || {};

  try {
    switch (payload.action) {
      case 'createOrder':
        return await createOrder(payload, wxContext);
      case 'getMyOrders':
        return await getMyOrders(wxContext);
      case 'listOrders':
        return await listOrders(payload);
      case 'updateStatus':
        return await updateStatus(payload);
      case 'cancelMyOrder':
        return await cancelMyOrder(payload, wxContext);
      default:
        throw new Error('未知的订单操作');
    }
  } catch (error) {
    return {
      ok: false,
      message: error.message || '订单服务异常',
    };
  }
};
