const config = require('../config/index');
const { mergeMenuItems, normalizeMenuItem } = require('./menu');

const MENU_KEY = 'family_order_menu_items_v1';

function canUseCloud() {
  return config.USE_CLOUD && wx.cloud && typeof wx.cloud.callFunction === 'function';
}

function readLocalItems() {
  try {
    const saved = wx.getStorageSync(MENU_KEY);
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function writeLocalItems(items) {
  wx.setStorageSync(MENU_KEY, items);
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
        throw new Error(result.message || '菜单服务暂不可用');
      }

      return result;
    });
}

function filterVisible(items, includeHidden) {
  return includeHidden
    ? items
    : items.filter(function keepEnabled(item) {
        return item.enabled;
      });
}

function listMenuItems(options) {
  const query = options || {};

  if (canUseCloud()) {
    return callOrderFunction('listMenuItems', {
      includeHidden: Boolean(query.includeHidden),
    }).then(function mapResult(result) {
      return filterVisible(mergeMenuItems(result.items || []), Boolean(query.includeHidden));
    });
  }

  return Promise.resolve(filterVisible(mergeMenuItems(readLocalItems()), Boolean(query.includeHidden)));
}

function saveMenuItem(item, adminPin) {
  const nextItem = normalizeMenuItem(item);

  if (!nextItem.name) {
    return Promise.reject(new Error('请填写名称'));
  }

  if (canUseCloud()) {
    return callOrderFunction('saveMenuItem', {
      adminPin: adminPin,
      item: nextItem,
    }).then(function mapResult(result) {
      return normalizeMenuItem(result.item);
    });
  }

  const items = readLocalItems().filter(function filterItem(savedItem) {
    return savedItem.id !== nextItem.id;
  });
  items.push(nextItem);
  writeLocalItems(items);

  return Promise.resolve(nextItem);
}

function toggleMenuItem(itemId, enabled, adminPin) {
  if (canUseCloud()) {
    return callOrderFunction('toggleMenuItem', {
      adminPin: adminPin,
      itemId: itemId,
      enabled: Boolean(enabled),
    }).then(function mapResult(result) {
      return normalizeMenuItem(result.item);
    });
  }

  const items = mergeMenuItems(readLocalItems());
  const target = items.find(function findItem(item) {
    return item.id === itemId;
  });

  if (!target) {
    return Promise.reject(new Error('没有找到这个内容'));
  }

  target.enabled = Boolean(enabled);
  writeLocalItems(items);

  return Promise.resolve(target);
}

module.exports = {
  listMenuItems,
  saveMenuItem,
  toggleMenuItem,
};
