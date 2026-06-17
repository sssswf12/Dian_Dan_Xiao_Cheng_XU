const config = require('../config/index');

const CURRENT_USER_KEY = 'family_order_current_user_v2';
const ADMIN_SESSION_KEY = 'family_order_admin_session_v1';
const USERS_KEY = 'family_order_users_v2';

function canUseCloud() {
  return config.USE_CLOUD && wx.cloud && typeof wx.cloud.callFunction === 'function';
}

function createId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function normalizeUser(user, index) {
  const name = String(user.name || '').trim();
  const account = String(user.account || '').trim();

  return {
    id: String(user.id || createId('user')),
    account: account,
    password: String(user.password || '').trim(),
    name: name,
    initial: name ? name.slice(0, 1) : '?',
    note: String(user.note || '').trim(),
    enabled: user.enabled !== false,
    sort: Number.isNaN(Number(user.sort)) ? index || 0 : Number(user.sort),
  };
}

function mergeUsers(customUsers) {
  const byId = {};

  config.DEFAULT_USERS.forEach(function addDefault(user, index) {
    byId[user.id] = normalizeUser(Object.assign({ sort: index + 1 }, user), index + 1);
  });

  (customUsers || []).forEach(function addCustom(user, index) {
    const base = user.id ? byId[user.id] || {} : {};
    const normalized = normalizeUser(
      Object.assign({}, base, user),
      config.DEFAULT_USERS.length + index + 1
    );
    byId[normalized.id] = Object.assign({}, byId[normalized.id] || {}, normalized);
  });

  return Object.keys(byId)
    .map(function mapUser(id) {
      return normalizeUser(byId[id]);
    })
    .filter(function keepNamed(user) {
      return Boolean(user.name);
    })
    .sort(function sortUser(a, b) {
      return a.sort - b.sort;
    });
}

function readLocalUsers() {
  try {
    const saved = wx.getStorageSync(USERS_KEY);
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function writeLocalUsers(users) {
  wx.setStorageSync(USERS_KEY, users);
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
        throw new Error(result.message || '家庭成员服务暂不可用');
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

function listUsers(options) {
  const query = options || {};

  if (canUseCloud()) {
    return callOrderFunction('listUsers', {
      includeDisabled: Boolean(query.includeDisabled),
      adminPin: query.adminPin || '',
    }).then(function mapResult(result) {
      const users = mergeUsers(result.users || []);
      return query.includeDisabled
        ? users
        : users.filter(function keepEnabled(user) {
            return user.enabled;
          });
    });
  }

  const users = mergeUsers(readLocalUsers());
  return Promise.resolve(
    query.includeDisabled
      ? users
      : users.filter(function keepEnabled(user) {
          return user.enabled;
        })
  );
}

function getCurrentUser() {
  try {
    const saved = wx.getStorageSync(CURRENT_USER_KEY);
    return saved && saved.id && saved.name ? normalizeUser(saved) : null;
  } catch (error) {
    return null;
  }
}

function getAdminUser() {
  const adminSession = getAdminSession();

  if (!adminSession) {
    return null;
  }

  return {
    id: 'admin',
    account: adminSession.account || config.ADMIN_ACCOUNT,
    name: adminSession.name || '管理员',
    initial: '管',
    note: '管理端',
    enabled: true,
    sort: 0,
    isAdmin: true,
  };
}

function getActiveUser() {
  return getCurrentUser() || getAdminUser();
}

function saveCurrentUser(user) {
  const nextUser = normalizeUser(user);
  const sessionUser = {
    id: nextUser.id,
    account: nextUser.account,
    name: nextUser.name,
    initial: nextUser.initial,
    note: nextUser.note,
    enabled: nextUser.enabled,
    sort: nextUser.sort,
  };

  wx.setStorageSync(CURRENT_USER_KEY, sessionUser);
  return sessionUser;
}

function clearCurrentUser() {
  wx.removeStorageSync(CURRENT_USER_KEY);
}

function getAdminSession() {
  try {
    const saved = wx.getStorageSync(ADMIN_SESSION_KEY);

    if (
      saved &&
      saved.account === config.ADMIN_ACCOUNT &&
      String(saved.adminPin || '') === String(config.ADMIN_PIN)
    ) {
      return saved;
    }

    wx.removeStorageSync(ADMIN_SESSION_KEY);
    return null;
  } catch (error) {
    return null;
  }
}

function saveAdminSession() {
  const session = {
    account: config.ADMIN_ACCOUNT,
    name: '管理员',
    adminPin: config.ADMIN_PIN,
  };

  wx.setStorageSync(ADMIN_SESSION_KEY, session);
  return session;
}

function clearAdminSession() {
  wx.removeStorageSync(ADMIN_SESSION_KEY);
}

function saveUser(user, adminPin) {
  const nextUser = normalizeUser(user);

  if (!nextUser.name) {
    return Promise.reject(new Error('请填写成员名称'));
  }

  if (!nextUser.account) {
    return Promise.reject(new Error('请填写登录账号'));
  }

  if (!nextUser.password) {
    return Promise.reject(new Error('请填写登录密码'));
  }

  if (canUseCloud()) {
    return callOrderFunction('saveUser', {
      adminPin: adminPin,
      user: nextUser,
    }).then(function mapResult(result) {
      return normalizeUser(result.user);
    });
  }

  const users = readLocalUsers().filter(function filterUser(item) {
    return item.id !== nextUser.id;
  });
  users.push(nextUser);
  writeLocalUsers(users);

  return Promise.resolve(nextUser);
}

function loginUser(account, password) {
  const loginAccount = String(account || '').trim();
  const loginPassword = String(password || '').trim();

  if (!loginAccount || !loginPassword) {
    return Promise.reject(new Error('请输入账号和密码'));
  }

  if (canUseCloud()) {
    return callOrderFunction('loginUser', {
      account: loginAccount,
      password: loginPassword,
    }).then(function mapResult(result) {
      return saveCurrentUser(result.user);
    });
  }

  return listUsers({ includeDisabled: true }).then(function findMatchedUser(users) {
    const matchedUser = users.find(function matchUser(user) {
      return user.account === loginAccount && user.password === loginPassword;
    });

    if (!matchedUser || !matchedUser.enabled) {
      throw new Error('账号或密码不正确');
    }

    return saveCurrentUser(matchedUser);
  });
}

function isAdminCredential(account, password) {
  return String(account || '').trim() === config.ADMIN_ACCOUNT && String(password || '').trim() === config.ADMIN_PASSWORD;
}

function loginAdmin(account, password) {
  if (!isAdminCredential(account, password)) {
    return Promise.reject(new Error('管理员账号或密码不正确'));
  }

  clearCurrentUser();
  return Promise.resolve(saveAdminSession());
}

function toggleUser(userId, enabled, adminPin) {
  if (canUseCloud()) {
    return callOrderFunction('toggleUser', {
      adminPin: adminPin,
      userId: userId,
      enabled: Boolean(enabled),
    }).then(function mapResult(result) {
      return normalizeUser(result.user);
    });
  }

  const users = mergeUsers(readLocalUsers());
  const target = users.find(function findUser(user) {
    return user.id === userId;
  });

  if (!target) {
    return Promise.reject(new Error('没有找到这个成员'));
  }

  target.enabled = Boolean(enabled);
  writeLocalUsers(users);

  return Promise.resolve(target);
}

module.exports = {
  clearAdminSession,
  clearCurrentUser,
  getActiveUser,
  getAdminUser,
  getAdminSession,
  getCurrentUser,
  isAdminCredential,
  loginAdmin,
  listUsers,
  loginUser,
  saveCurrentUser,
  saveUser,
  toggleUser,
};
