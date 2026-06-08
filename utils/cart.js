const { getMenuItem } = require('./menu');
const { formatPrice } = require('./format');

const CART_KEY = 'cute_order_cart_v1';

function emptyCart() {
  return {
    items: [],
    totalCount: 0,
    totalPrice: 0,
    totalPriceText: '0',
  };
}

function normalizeQuantity(value) {
  const quantity = parseInt(value, 10);
  return Number.isNaN(quantity) || quantity < 0 ? 0 : quantity;
}

function summarize(items) {
  const nextItems = (items || [])
    .map(function normalizeItem(item) {
      return Object.assign({}, item, {
        price: Number(item.price || 0),
        priceText: formatPrice(item.price),
        quantity: normalizeQuantity(item.quantity),
      });
    })
    .filter(function keepItem(item) {
      return item.quantity > 0;
    });

  const totalCount = nextItems.reduce(function count(sum, item) {
    return sum + item.quantity;
  }, 0);
  const totalPrice = nextItems.reduce(function price(sum, item) {
    return sum + item.price * item.quantity;
  }, 0);

  return {
    items: nextItems,
    totalCount: totalCount,
    totalPrice: totalPrice,
    totalPriceText: formatPrice(totalPrice),
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

function addItem(id) {
  const menuItem = getMenuItem(id);

  if (!menuItem) {
    return getCart();
  }

  const cart = getCart();
  const items = cart.items.slice();
  const index = items.findIndex(function findItem(item) {
    return item.id === id;
  });

  if (index >= 0) {
    items[index].quantity += 1;
  } else {
    items.push({
      id: menuItem.id,
      category: menuItem.category,
      categoryName: menuItem.categoryName,
      name: menuItem.name,
      price: menuItem.price,
      priceText: menuItem.priceText,
      unit: menuItem.unit,
      art: menuItem.art,
      themeBg: menuItem.themeBg,
      themeAccent: menuItem.themeAccent,
      quantity: 1,
    });
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
    const menuItem = getMenuItem(orderItem.id);

    if (!menuItem) {
      return;
    }

    items.push({
      id: menuItem.id,
      category: menuItem.category,
      categoryName: menuItem.categoryName,
      name: menuItem.name,
      price: menuItem.price,
      priceText: menuItem.priceText,
      unit: menuItem.unit,
      art: menuItem.art,
      themeBg: menuItem.themeBg,
      themeAccent: menuItem.themeAccent,
      quantity: normalizeQuantity(orderItem.quantity) || 1,
    });
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
