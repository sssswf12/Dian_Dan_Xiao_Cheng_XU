const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const ORDERS_COLLECTION = 'orders';
const MENU_COLLECTION = 'menuItems';
const USERS_COLLECTION = 'users';
const ADMIN_PIN = process.env.ADMIN_PIN || '';
const VALID_STATUS = ['pending', 'confirmed', 'completed', 'cancelled'];
const VALID_CATEGORY = ['dish', 'drink', 'dessert', 'fruit', 'other'];

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

  return 'F' + stamp + suffix;
}

function cleanText(value, maxLength) {
  return String(value || '')
    .trim()
    .slice(0, maxLength);
}

function createId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function assertAdminPin(pin) {
  if (!ADMIN_PIN) {
    throw new Error('请先配置云函数 ADMIN_PIN 环境变量');
  }

  if (String(pin || '') !== String(ADMIN_PIN)) {
    throw new Error('管理员密码不正确');
  }
}

function normalizeStatus(status) {
  if (status === 'accepted' || status === 'ready') {
    return 'confirmed';
  }

  return status || 'pending';
}

function sanitizeItems(items) {
  const nextItems = (Array.isArray(items) ? items : [])
    .slice(0, 80)
    .map(function mapItem(item) {
      return {
        id: cleanText(item.id, 60),
        name: cleanText(item.name, 40),
        categoryName: cleanText(item.categoryName, 20),
        unit: cleanText(item.unit, 12) || '份',
        quantity: Math.min(99, Math.max(1, parseInt(item.quantity, 10) || 1)),
      };
    })
    .filter(function keepItem(item) {
      return item.id && item.name && item.quantity > 0;
    });

  if (!nextItems.length) {
    throw new Error('订单里没有有效内容');
  }

  return nextItems;
}

function sanitizeOrder(rawOrder, openid) {
  const items = sanitizeItems(rawOrder.items);
  const userId = cleanText(rawOrder.userId, 60);
  const userName = cleanText(rawOrder.userName, 24);
  const now = Date.now();
  const totalCount = items.reduce(function sumCount(sum, item) {
    return sum + item.quantity;
  }, 0);

  if (!userId || !userName) {
    throw new Error('请先登录账号');
  }

  return {
    orderNo: cleanText(rawOrder.orderNo, 32) || createOrderNo(),
    status: 'pending',
    userId: userId,
    userName: userName,
    diningType: cleanText(rawOrder.diningType, 12) || '家里吃',
    location: cleanText(rawOrder.location || rawOrder.tableNo, 24),
    remark: cleanText(rawOrder.remark, 120),
    items: items,
    totalCount: totalCount,
    openid: openid,
    createdAtMs: now,
    updatedAtMs: now,
    createdAtText: formatDate(now),
    updatedAtText: formatDate(now),
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

function sanitizeMenuItem(rawItem) {
  const category = VALID_CATEGORY.indexOf(rawItem.category) >= 0 ? rawItem.category : 'other';
  const name = cleanText(rawItem.name, 40);

  if (!name) {
    throw new Error('请填写名称');
  }

  return {
    id: cleanText(rawItem.id, 60) || createId('item'),
    category: category,
    categoryName: cleanText(rawItem.categoryName, 20),
    name: name,
    desc: cleanText(rawItem.desc, 120),
    unit: cleanText(rawItem.unit, 12) || '份',
    tag: cleanText(rawItem.tag, 12),
    enabled: rawItem.enabled !== false,
    deleted: false,
    sort: parseInt(rawItem.sort, 10) || 100,
    art: cleanText(rawItem.art, 20) || category,
    themeBg: cleanText(rawItem.themeBg, 20) || '#FFF4D7',
    themeAccent: cleanText(rawItem.themeAccent, 20) || '#FF7F7F',
    imageUrl: cleanText(rawItem.imageUrl, 300),
    updatedAtMs: Date.now(),
  };
}

function sanitizeUser(rawUser) {
  const name = cleanText(rawUser.name, 24);
  const account = cleanText(rawUser.account, 24);
  const password = cleanText(rawUser.password, 32);

  if (!name) {
    throw new Error('请填写成员名称');
  }

  if (!account) {
    throw new Error('请填写登录账号');
  }

  if (!password) {
    throw new Error('请填写登录密码');
  }

  return {
    id: cleanText(rawUser.id, 60) || createId('user'),
    account: account,
    password: password,
    name: name,
    note: cleanText(rawUser.note, 40),
    enabled: rawUser.enabled !== false,
    sort: parseInt(rawUser.sort, 10) || 100,
    updatedAtMs: Date.now(),
  };
}

async function safeGet(query) {
  try {
    return await query.get();
  } catch (error) {
    return { data: [] };
  }
}

async function getOrder(orderId) {
  const result = await db.collection(ORDERS_COLLECTION).doc(orderId).get();
  return result.data;
}

async function upsertPatch(collectionName, id, patch) {
  try {
    await db.collection(collectionName).doc(id).update({
      data: patch,
    });
  } catch (error) {
    await db.collection(collectionName).doc(id).set({
      data: Object.assign({ id: id }, patch),
    });
  }
}

async function createOrder(event, wxContext) {
  const order = sanitizeOrder(event.order || {}, wxContext.OPENID);
  const result = await db.collection(ORDERS_COLLECTION).add({
    data: order,
  });

  return {
    ok: true,
    order: Object.assign({ _id: result._id }, order),
  };
}

async function getMyOrders(event) {
  const userId = cleanText(event.userId, 60);

  if (!userId) {
    return {
      ok: true,
      orders: [],
    };
  }

  const result = await safeGet(
    db
      .collection(ORDERS_COLLECTION)
      .where({
        userId: userId,
      })
      .orderBy('createdAtMs', 'desc')
      .limit(50)
  );

  return {
    ok: true,
    orders: result.data,
  };
}

async function listOrders(event) {
  assertAdminPin(event.adminPin);

  const rawStatus = cleanText(event.status, 20);
  const status = rawStatus ? normalizeStatus(rawStatus) : 'all';
  let query = db.collection(ORDERS_COLLECTION);

  if (status && status !== 'all') {
    query = query.where({
      status: status,
    });
  }

  const result = await safeGet(query.orderBy('createdAtMs', 'desc').limit(100));

  return {
    ok: true,
    orders: result.data,
  };
}

async function updateStatus(event) {
  assertAdminPin(event.adminPin);

  const orderId = cleanText(event.orderId, 80);
  const status = normalizeStatus(cleanText(event.status, 20));

  if (!orderId) {
    throw new Error('缺少订单编号');
  }

  if (VALID_STATUS.indexOf(status) < 0) {
    throw new Error('订单状态不正确');
  }

  const now = Date.now();
  await db
    .collection(ORDERS_COLLECTION)
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

async function cancelMyOrder(event) {
  const orderId = cleanText(event.orderId, 80);
  const userId = cleanText(event.userId, 60);

  if (!orderId || !userId) {
    throw new Error('缺少订单编号或成员账号');
  }

  const order = await getOrder(orderId);

  if (!order || order.userId !== userId) {
    throw new Error('没有找到这笔订单');
  }

  if (normalizeStatus(order.status) !== 'pending') {
    throw new Error('订单已确认，不能取消');
  }

  const now = Date.now();
  await db
    .collection(ORDERS_COLLECTION)
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

async function listMenuItems() {
  const result = await safeGet(db.collection(MENU_COLLECTION).orderBy('sort', 'asc').limit(200));

  return {
    ok: true,
    items: result.data,
  };
}

async function saveMenuItem(event) {
  assertAdminPin(event.adminPin);

  const item = sanitizeMenuItem(event.item || {});
  await db.collection(MENU_COLLECTION).doc(item.id).set({
    data: item,
  });

  return {
    ok: true,
    item: item,
  };
}

async function toggleMenuItem(event) {
  assertAdminPin(event.adminPin);

  const itemId = cleanText(event.itemId, 60);

  if (!itemId) {
    throw new Error('缺少内容编号');
  }

  const patch = {
    id: itemId,
    enabled: Boolean(event.enabled),
    deleted: false,
    updatedAtMs: Date.now(),
  };

  await upsertPatch(MENU_COLLECTION, itemId, patch);

  return {
    ok: true,
    item: patch,
  };
}

async function deleteMenuItem(event) {
  assertAdminPin(event.adminPin);

  const itemId = cleanText(event.itemId, 60);

  if (!itemId) {
    throw new Error('缺少内容编号');
  }

  const patch = {
    id: itemId,
    enabled: false,
    deleted: true,
    updatedAtMs: Date.now(),
  };

  await upsertPatch(MENU_COLLECTION, itemId, patch);

  return {
    ok: true,
    item: patch,
  };
}

async function listUsers(event) {
  if (event.includeDisabled) {
    assertAdminPin(event.adminPin);
  }

  const result = await safeGet(db.collection(USERS_COLLECTION).orderBy('sort', 'asc').limit(100));

  return {
    ok: true,
    users: result.data,
  };
}

async function loginUser(event) {
  const account = cleanText(event.account, 24);
  const password = cleanText(event.password, 32);

  if (!account || !password) {
    throw new Error('请输入账号和密码');
  }

  const result = await safeGet(
    db
      .collection(USERS_COLLECTION)
      .where({
        account: account,
        password: password,
        enabled: true,
      })
      .limit(1)
  );
  const user = result.data && result.data[0];

  if (!user) {
    throw new Error('账号或密码不正确');
  }

  return {
    ok: true,
    user: {
      id: user.id || user._id,
      account: user.account,
      name: user.name,
      note: user.note || '',
      enabled: user.enabled !== false,
      sort: user.sort || 100,
    },
  };
}

async function saveUser(event) {
  assertAdminPin(event.adminPin);

  const user = sanitizeUser(event.user || {});
  await db.collection(USERS_COLLECTION).doc(user.id).set({
    data: user,
  });

  return {
    ok: true,
    user: user,
  };
}

async function toggleUser(event) {
  assertAdminPin(event.adminPin);

  const userId = cleanText(event.userId, 60);

  if (!userId) {
    throw new Error('缺少成员编号');
  }

  const patch = {
    id: userId,
    enabled: Boolean(event.enabled),
    updatedAtMs: Date.now(),
  };

  await upsertPatch(USERS_COLLECTION, userId, patch);

  return {
    ok: true,
    user: patch,
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
        return await getMyOrders(payload);
      case 'listOrders':
        return await listOrders(payload);
      case 'updateStatus':
        return await updateStatus(payload);
      case 'cancelMyOrder':
        return await cancelMyOrder(payload);
      case 'listMenuItems':
        return await listMenuItems(payload);
      case 'saveMenuItem':
        return await saveMenuItem(payload);
      case 'toggleMenuItem':
        return await toggleMenuItem(payload);
      case 'deleteMenuItem':
        return await deleteMenuItem(payload);
      case 'listUsers':
        return await listUsers(payload);
      case 'loginUser':
        return await loginUser(payload);
      case 'saveUser':
        return await saveUser(payload);
      case 'toggleUser':
        return await toggleUser(payload);
      default:
        throw new Error('未知的服务操作，请重新部署 orderService 云函数');
    }
  } catch (error) {
    return {
      ok: false,
      message: error.message || '订单服务异常',
    };
  }
};
