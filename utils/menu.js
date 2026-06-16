const CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'dish', name: '菜品' },
  { id: 'drink', name: '饮品' },
  { id: 'dessert', name: '甜品' },
  { id: 'fruit', name: '水果' },
  { id: 'other', name: '其他' },
];

const VISUAL_PRESETS = [
  { id: 'dish', name: '菜品', art: 'dish', themeBg: '#FFF4D7', themeAccent: '#FF7F7F', imageUrl: '/assets/menu/dish.svg' },
  { id: 'noodle', name: '面食', art: 'noodle', themeBg: '#FFE7A6', themeAccent: '#FF986E', imageUrl: '/assets/menu/noodle.svg' },
  { id: 'rice', name: '米饭', art: 'rice', themeBg: '#F8D7A4', themeAccent: '#D9824B', imageUrl: '/assets/menu/rice.svg' },
  { id: 'soup', name: '热汤', art: 'soup', themeBg: '#FFE3B8', themeAccent: '#E59A4A', imageUrl: '/assets/menu/soup.svg' },
  { id: 'egg', name: '鸡蛋', art: 'egg', themeBg: '#FFF0B8', themeAccent: '#F1B93D', imageUrl: '/assets/menu/egg.svg' },
  { id: 'bread', name: '面包', art: 'bread', themeBg: '#F4D2A5', themeAccent: '#C98345', imageUrl: '/assets/menu/bread.svg' },
  { id: 'toast', name: '吐司', art: 'toast', themeBg: '#F4D2A5', themeAccent: '#C98345', imageUrl: '/assets/menu/toast.svg' },
  { id: 'sandwich', name: '三明治', art: 'sandwich', themeBg: '#FFE4A6', themeAccent: '#7FAF66', imageUrl: '/assets/menu/sandwich.svg' },
  { id: 'pizza', name: '披萨', art: 'pizza', themeBg: '#FFE4A6', themeAccent: '#E06C5C', imageUrl: '/assets/menu/pizza.svg' },
  { id: 'fish', name: '鱼肉', art: 'fish', themeBg: '#D3F0F0', themeAccent: '#4FAFB1', imageUrl: '/assets/menu/fish.svg' },
  { id: 'chicken', name: '鸡块', art: 'chicken', themeBg: '#FFE1B5', themeAccent: '#E49B3F', imageUrl: '/assets/menu/chicken.svg' },
  { id: 'beef', name: '牛肉', art: 'beef', themeBg: '#FFD6D1', themeAccent: '#C75D5B', imageUrl: '/assets/menu/beef.svg' },
  { id: 'shrimp', name: '虾仁', art: 'shrimp', themeBg: '#FFE0D8', themeAccent: '#E87D70', imageUrl: '/assets/menu/shrimp.svg' },
  { id: 'veggie', name: '蔬菜', art: 'veggie', themeBg: '#DDF2C9', themeAccent: '#6CA85E', imageUrl: '/assets/menu/veggie.svg' },
  { id: 'salad', name: '沙拉', art: 'salad', themeBg: '#E5F4CF', themeAccent: '#74A85D', imageUrl: '/assets/menu/salad.svg' },
  { id: 'snack', name: '小吃', art: 'snack', themeBg: '#FFE1B5', themeAccent: '#E49B3F', imageUrl: '/assets/menu/snack.svg' },
  { id: 'fries', name: '薯条', art: 'fries', themeBg: '#FFF0B8', themeAccent: '#FF7F7F', imageUrl: '/assets/menu/fries.svg' },
  { id: 'dumpling', name: '饺子', art: 'dumpling', themeBg: '#E6F3DD', themeAccent: '#70A866', imageUrl: '/assets/menu/dumpling.svg' },
  { id: 'bao', name: '包子', art: 'bao', themeBg: '#FFF4DF', themeAccent: '#D7A46E', imageUrl: '/assets/menu/bao.svg' },
  { id: 'drink', name: '饮品', art: 'drink', themeBg: '#CFEFDB', themeAccent: '#4AA783', imageUrl: '/assets/menu/drink.svg' },
  { id: 'lemon', name: '柠檬', art: 'lemon', themeBg: '#EAF5B9', themeAccent: '#D3AF35', imageUrl: '/assets/menu/lemon.svg' },
  { id: 'cocoa', name: '可可', art: 'cocoa', themeBg: '#D8C7B8', themeAccent: '#7C5F55', imageUrl: '/assets/menu/cocoa.svg' },
  { id: 'tea', name: '热茶', art: 'tea', themeBg: '#DDEFD9', themeAccent: '#6DAA7A', imageUrl: '/assets/menu/tea.svg' },
  { id: 'milk', name: '牛奶', art: 'milk', themeBg: '#E4F5FF', themeAccent: '#8BC3E6', imageUrl: '/assets/menu/milk.svg' },
  { id: 'juice', name: '果汁', art: 'juice', themeBg: '#FFDDBD', themeAccent: '#FF986E', imageUrl: '/assets/menu/juice.svg' },
  { id: 'smoothie', name: '奶昔', art: 'smoothie', themeBg: '#FFE0EC', themeAccent: '#E577A0', imageUrl: '/assets/menu/smoothie.svg' },
  { id: 'soda', name: '汽水', art: 'soda', themeBg: '#D9F0FF', themeAccent: '#63A8D6', imageUrl: '/assets/menu/soda.svg' },
  { id: 'coffee', name: '咖啡', art: 'coffee', themeBg: '#D8C7B8', themeAccent: '#7C5F55', imageUrl: '/assets/menu/coffee.svg' },
  { id: 'dessert', name: '布丁', art: 'dessert', themeBg: '#FFD3D5', themeAccent: '#EF6C74', imageUrl: '/assets/menu/pudding.svg' },
  { id: 'cake', name: '蛋糕', art: 'cake', themeBg: '#FFE0EC', themeAccent: '#E577A0', imageUrl: '/assets/menu/cake.svg' },
  { id: 'cookie', name: '饼干', art: 'cookie', themeBg: '#F1D0A8', themeAccent: '#B56F3D', imageUrl: '/assets/menu/cookie.svg' },
  { id: 'icecream', name: '冰淇淋', art: 'icecream', themeBg: '#FFE3EF', themeAccent: '#E577A0', imageUrl: '/assets/menu/icecream.svg' },
  { id: 'donut', name: '甜甜圈', art: 'donut', themeBg: '#F1D0A8', themeAccent: '#E577A0', imageUrl: '/assets/menu/donut.svg' },
  { id: 'tart', name: '蛋挞', art: 'tart', themeBg: '#FFE4A6', themeAccent: '#D99155', imageUrl: '/assets/menu/tart.svg' },
  { id: 'pancake', name: '松饼', art: 'pancake', themeBg: '#FFE4A6', themeAccent: '#D99155', imageUrl: '/assets/menu/pancake.svg' },
  { id: 'apple', name: '苹果', art: 'apple', themeBg: '#FFD9DF', themeAccent: '#E95F6D', imageUrl: '/assets/menu/apple.svg' },
  { id: 'banana', name: '香蕉', art: 'banana', themeBg: '#FFEAB8', themeAccent: '#E1B340', imageUrl: '/assets/menu/banana.svg' },
  { id: 'fruit', name: '水果杯', art: 'fruit', themeBg: '#F6D9F0', themeAccent: '#C96AAE', imageUrl: '/assets/menu/fruit-cup.svg' },
  { id: 'orange', name: '橙子', art: 'orange', themeBg: '#FFE1B5', themeAccent: '#F0A348', imageUrl: '/assets/menu/orange.svg' },
  { id: 'peach', name: '桃子', art: 'peach', themeBg: '#FFD9DF', themeAccent: '#E98091', imageUrl: '/assets/menu/peach.svg' },
  { id: 'cherry', name: '樱桃', art: 'cherry', themeBg: '#FFD7DD', themeAccent: '#E95F6D', imageUrl: '/assets/menu/cherry.svg' },
  { id: 'blueberry', name: '蓝莓', art: 'blueberry', themeBg: '#E8D8F4', themeAccent: '#8274D6', imageUrl: '/assets/menu/blueberry.svg' },
  { id: 'strawberry', name: '草莓', art: 'strawberry', themeBg: '#FFD7DD', themeAccent: '#E95F6D', imageUrl: '/assets/menu/strawberry.svg' },
  { id: 'grape', name: '葡萄', art: 'grape', themeBg: '#E8D8F4', themeAccent: '#A86CC0', imageUrl: '/assets/menu/grape.svg' },
  { id: 'watermelon', name: '西瓜', art: 'watermelon', themeBg: '#DDF2C9', themeAccent: '#E95F6D', imageUrl: '/assets/menu/watermelon.svg' },
  { id: 'pear', name: '梨子', art: 'pear', themeBg: '#E9F5B9', themeAccent: '#91B84D', imageUrl: '/assets/menu/pear.svg' },
  { id: 'popcorn', name: '爆米花', art: 'popcorn', themeBg: '#FFF0B8', themeAccent: '#FF7F7F', imageUrl: '/assets/menu/popcorn.svg' },
  { id: 'yogurt', name: '酸奶', art: 'yogurt', themeBg: '#F0F8FF', themeAccent: '#E577A0', imageUrl: '/assets/menu/yogurt.svg' },
  { id: 'other', name: '其他', art: 'other', themeBg: '#E6EAF2', themeAccent: '#6C7A96', imageUrl: '/assets/menu/other.svg' },
];

const RAW_MENU_ITEMS = [
  {
    id: 'dish_001',
    category: 'dish',
    name: '番茄鸡蛋面',
    desc: '家常汤面，适合想吃热乎一点的时候。',
    unit: '碗',
    tag: '热乎',
    art: 'noodle',
    themeBg: '#FFE7A6',
    themeAccent: '#FF986E',
  },
  {
    id: 'dish_002',
    category: 'dish',
    name: '蛋炒饭',
    desc: '米饭、鸡蛋和一点蔬菜，简单顶饱。',
    unit: '份',
    tag: '主食',
    art: 'rice',
    themeBg: '#F8D7A4',
    themeAccent: '#D9824B',
  },
  {
    id: 'dish_003',
    category: 'dish',
    name: '香酥鸡块',
    desc: '外层酥脆，适合当小吃或加餐。',
    unit: '份',
    tag: '小吃',
    art: 'snack',
    themeBg: '#FFE1B5',
    themeAccent: '#E49B3F',
  },
  {
    id: 'drink_001',
    category: 'drink',
    name: '温水',
    desc: '不冰不烫，日常补水。',
    unit: '杯',
    tag: '常备',
    art: 'drink',
    themeBg: '#CFEFDB',
    themeAccent: '#4AA783',
  },
  {
    id: 'drink_002',
    category: 'drink',
    name: '柠檬水',
    desc: '清爽酸甜，可以备注少糖或常温。',
    unit: '杯',
    tag: '清爽',
    art: 'lemon',
    themeBg: '#D7F1B9',
    themeAccent: '#75A94D',
  },
  {
    id: 'drink_003',
    category: 'drink',
    name: '可可牛奶',
    desc: '热牛奶加可可，适合晚上喝。',
    unit: '杯',
    tag: '热饮',
    art: 'cocoa',
    themeBg: '#D8C7B8',
    themeAccent: '#7C5F55',
  },
  {
    id: 'dessert_001',
    category: 'dessert',
    name: '草莓布丁',
    desc: '奶香布丁配草莓酱。',
    unit: '杯',
    tag: '甜品',
    art: 'dessert',
    themeBg: '#FFD3D5',
    themeAccent: '#EF6C74',
  },
  {
    id: 'dessert_002',
    category: 'dessert',
    name: '焦糖小饼',
    desc: '适合配茶或当下午加餐。',
    unit: '份',
    tag: '',
    art: 'cookie',
    themeBg: '#F1D0A8',
    themeAccent: '#B56F3D',
  },
  {
    id: 'fruit_001',
    category: 'fruit',
    name: '苹果切块',
    desc: '洗净切块，适合饭后吃。',
    unit: '份',
    tag: '水果',
    art: 'apple',
    themeBg: '#FFD9DF',
    themeAccent: '#E95F6D',
  },
  {
    id: 'fruit_002',
    category: 'fruit',
    name: '香蕉',
    desc: '整根或切片都可以在备注里说明。',
    unit: '根',
    tag: '水果',
    art: 'banana',
    themeBg: '#FFEAB8',
    themeAccent: '#E1B340',
  },
  {
    id: 'fruit_003',
    category: 'fruit',
    name: '水果杯',
    desc: '按家里现有水果搭配。',
    unit: '杯',
    tag: '混合',
    art: 'fruit',
    themeBg: '#F6D9F0',
    themeAccent: '#C96AAE',
  },
  {
    id: 'other_001',
    category: 'other',
    name: '帮忙提醒',
    desc: '不属于吃喝的临时需求，可以备注说明。',
    unit: '项',
    tag: '其他',
    art: 'other',
    themeBg: '#E6EAF2',
    themeAccent: '#6C7A96',
  },
];

function getCategoryName(category) {
  const match = CATEGORIES.find(function findCategory(item) {
    return item.id === category;
  });

  return match ? match.name : '其他';
}

function getPresetImage(art) {
  const matched = VISUAL_PRESETS.find(function findPreset(item) {
    return item.art === art || item.id === art;
  });

  return matched ? matched.imageUrl : '/assets/menu/dish.svg';
}

function normalizeMenuItem(item, index) {
  const category = item.category || 'other';
  const categoryName = item.categoryName || getCategoryName(category);
  const unit = String(item.unit || '份').trim();
  const tag = String(item.tag || '').trim();
  const art = item.art || category;

  return {
    id: String(item.id || 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
    category: category,
    categoryName: categoryName,
    name: String(item.name || '').trim(),
    desc: String(item.desc || '').trim(),
    unit: unit,
    tag: tag,
    metaText: categoryName + ' / ' + unit + (tag ? ' / ' + tag : ''),
    art: art,
    themeBg: item.themeBg || '#FFF4D7',
    themeAccent: item.themeAccent || '#FF7F7F',
    imageUrl: String(item.imageUrl || '').trim() || getPresetImage(art),
    enabled: item.enabled !== false,
    sort: Number.isNaN(Number(item.sort)) ? index || 0 : Number(item.sort),
  };
}

const DEFAULT_MENU_ITEMS = RAW_MENU_ITEMS.map(function mapDefault(item, index) {
  return normalizeMenuItem(Object.assign({ sort: index + 1 }, item), index + 1);
});

function mergeMenuItems(customItems) {
  const byId = {};

  DEFAULT_MENU_ITEMS.forEach(function addDefault(item) {
    byId[item.id] = Object.assign({}, item);
  });

  (customItems || []).forEach(function addCustom(item, index) {
    const base = item.id ? byId[item.id] || {} : {};
    const normalized = normalizeMenuItem(
      Object.assign({}, base, item),
      DEFAULT_MENU_ITEMS.length + index + 1
    );
    byId[normalized.id] = Object.assign({}, byId[normalized.id] || {}, normalized);
  });

  return Object.keys(byId)
    .map(function mapItem(id) {
      return normalizeMenuItem(byId[id]);
    })
    .sort(function sortItem(a, b) {
      return a.sort - b.sort;
    });
}

function getDefaultMenuItem(id) {
  return DEFAULT_MENU_ITEMS.find(function findItem(item) {
    return item.id === id;
  });
}

module.exports = {
  CATEGORIES,
  DEFAULT_MENU_ITEMS,
  VISUAL_PRESETS,
  getCategoryName,
  getDefaultMenuItem,
  getPresetImage,
  mergeMenuItems,
  normalizeMenuItem,
};
