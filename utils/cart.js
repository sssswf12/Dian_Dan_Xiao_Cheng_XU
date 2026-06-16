const { getDefaultMenuItem, normalizeMenuItem } = require('./menu');

const CART_KEY = 'family_order_cart_v1';

function emptyCart() {
  return {
    items: [],
    totalCount: 0,
  };
}

function normalizeQuantity(value) {
  const quantity = parseInt(value, 10);
  return Number.isNaN(quantity) || quantity < 0 ? 0 : quantity;
}

function normalizeCartItem(item) {
  const normalized = normalizeMenuItem(item);

  return {
    id: normalized.id,
    category: normalized.category,
    categoryName: normalized.categoryName,
    name: normalized.name,
    desc: normalized.desc,
    unit: normalized.unit,
    art: normalized.art,
    themeBg: normalized.themeBg,
    themeAccent: normalized.themeAccent,
    imageUrl: normalized.imageUrl,
    quantity: normalizeQuantity(item.quantity) || 1,
  };
}

function summarize(items) {
  const nextItems = (items || [])
    .map(normalizeCartItem)
    .filter(function keepItem(item) {
      return item.quantity > 0 && item.name;
    });

  const totalCount = nextItems.reduce(function count(sum, item) {
    return sum + item.quantity;
  }, 0);

  return {
    items: nextItems,
    totalCount: totalCount,
  };
}

function getCart() {
  try {
    const saved = wx.getStorageSync(CART_KEY);

    if (!saved || !Array.isArray(saved.items)) {
      return emptyCart();
    }

    return summarize(saved.items);
  } catch (error) {
    return emptyCart();
  }
}

function saveCart(cart) {
  const nextCart = summarize(cart.items);
  wx.setStorageSync(CART_KEY, nextCart);
  return nextCart;
}

function resolveItem(itemOrId) {
  if (typeof itemOrId === 'string') {
    return getDefaultMenuItem(itemOrId);
  }

  return itemOrId;
}

function addItem(itemOrId) {
  const menuItem = resolveItem(itemOrId);

  if (!menuItem) {
    return getCart();
  }

  const cart = getCart();
  const items = cart.items.slice();
  const index = items.findIndex(function findItem(item) {
    return item.id === menuItem.id;
  });

  if (index >= 0) {
    items[index].quantity += 1;
  } else {
    items.push(Object.assign({}, normalizeCartItem(menuItem), { quantity: 1 }));
  }

  return saveCart({ items: items });
}

function setQuantity(id, quantity) {
  const normalizedQuantity = normalizeQuantity(quantity);
  const cart = getCart();
  const items = cart.items
    .map(function updateItem(item) {
      if (item.id !== id) {
        return item;
      }

      return Object.assign({}, item, {
        quantity: normalizedQuantity,
      });
    })
    .filter(function keepItem(item) {
      return item.quantity > 0;
    });

  return saveCart({ items: items });
}

function decreaseItem(id) {
  const cart = getCart();
  const target = cart.items.find(function findItem(item) {
    return item.id === id;
  });

  if (!target) {
    return cart;
  }

  return setQuantity(id, target.quantity - 1);
}

function clearCart() {
  wx.removeStorageSync(CART_KEY);
  return emptyCart();
}

function fillFromOrder(orderItems) {
  const items = [];

  (orderItems || []).forEach(function pushOrderItem(orderItem) {
    items.push(
      Object.assign({}, normalizeCartItem(orderItem), {
        quantity: normalizeQuantity(orderItem.quantity) || 1,
      })
    );
  });

  return saveCart({ items: items });
}

module.exports = {
  addItem,
  clearCart,
  decreaseItem,
  fillFromOrder,
  getCart,
  setQuantity,
};
