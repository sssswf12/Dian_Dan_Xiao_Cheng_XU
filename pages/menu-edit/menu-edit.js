const accountService = require('../../utils/account-service');
const config = require('../../config/index');
const menuService = require('../../utils/menu-service');
const { CATEGORIES, VISUAL_PRESETS, getCategoryName, getPresetImage } = require('../../utils/menu');

const ITEM_CATEGORIES = CATEGORIES.filter(function keepBusinessCategory(category) {
  return category.id !== 'all';
});

function createItemForm() {
  return {
    id: '',
    category: 'dish',
    categoryName: '菜品',
    name: '',
    desc: '',
    unit: '份',
    tag: '',
    enabled: true,
    sort: 100,
    art: 'dish',
    themeBg: '#FFF4D7',
    themeAccent: '#FF7F7F',
    imageUrl: getPresetImage('dish'),
  };
}

function getCategoryIndex(categoryId) {
  const index = ITEM_CATEGORIES.findIndex(function findCategory(category) {
    return category.id === categoryId;
  });

  return index >= 0 ? index : 0;
}

function canUploadToCloud() {
  return config.USE_CLOUD && wx.cloud && typeof wx.cloud.uploadFile === 'function';
}

function getImageExtension(filePath) {
  const matched = String(filePath || '').match(/\.([a-z0-9]+)(?:\?|$)/i);
  const extension = matched ? matched[1].toLowerCase() : 'jpg';

  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].indexOf(extension) >= 0 ? extension : 'jpg';
}

function createCloudImagePath(filePath) {
  return [
    'menu-images/',
    Date.now(),
    '-',
    Math.floor(Math.random() * 100000),
    '.',
    getImageExtension(filePath),
  ].join('');
}

Page({
  data: {
    adminPin: '',
    itemId: '',
    loaded: false,
    title: '新增内容',
    itemCategories: ITEM_CATEGORIES,
    itemCategoryNames: ITEM_CATEGORIES.map(function mapCategory(category) {
      return category.name;
    }),
    itemCategoryIndex: 0,
    visualPresets: VISUAL_PRESETS,
    itemForm: createItemForm(),
    loading: false,
    uploading: false,
    saving: false,
  },

  onLoad(options) {
    const itemId = options && options.id ? decodeURIComponent(options.id) : '';

    this.setData({
      itemId: itemId,
      title: itemId ? '编辑内容' : '新增内容',
    });
  },

  onShow() {
    const adminSession = accountService.getAdminSession();

    if (!adminSession) {
      wx.reLaunch({
        url: '/pages/account/account',
      });
      return;
    }

    this.setData({
      adminPin: adminSession.adminPin,
    });

    if (this.data.loaded) {
      return;
    }

    if (this.data.itemId) {
      this.loadItem();
      return;
    }

    this.setData({
      loaded: true,
    });
  },

  loadItem() {
    this.setData({
      loading: true,
    });

    menuService
      .listMenuItems({ includeHidden: true })
      .then((items) => {
        const item = items.find((menuItem) => menuItem.id === this.data.itemId);

        if (!item) {
          throw new Error('没有找到这个内容');
        }

        this.setData({
          itemForm: Object.assign({}, createItemForm(), item),
          itemCategoryIndex: getCategoryIndex(item.category),
          loaded: true,
        });
      })
      .catch((error) => {
        wx.showToast({
          title: error.message || '加载失败',
          icon: 'none',
        });
      })
      .finally(() => {
        this.setData({
          loading: false,
        });
      });
  },

  onItemInput(event) {
    const field = event.currentTarget.dataset.field;

    this.setData({
      ['itemForm.' + field]: event.detail.value,
    });
  },

  onItemCategoryChange(event) {
    const index = Number(event.detail.value || 0);
    const category = this.data.itemCategories[index] || this.data.itemCategories[0];

    this.setData({
      itemCategoryIndex: index,
      'itemForm.category': category.id,
      'itemForm.categoryName': category.name,
      'itemForm.art': category.id,
      'itemForm.imageUrl': getPresetImage(category.id),
    });
  },

  onItemEnabledChange(event) {
    this.setData({
      'itemForm.enabled': event.detail.value,
    });
  },

  selectPreset(event) {
    const preset = this.data.visualPresets.find(function findPreset(item) {
      return item.id === event.currentTarget.dataset.id;
    });

    if (!preset) {
      return;
    }

    this.setData({
      'itemForm.art': preset.art,
      'itemForm.themeBg': preset.themeBg,
      'itemForm.themeAccent': preset.themeAccent,
      'itemForm.imageUrl': preset.imageUrl,
    });
  },

  chooseImage() {
    wx.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      success: (result) => {
        const filePath = result.tempFilePaths && result.tempFilePaths[0];

        if (!filePath) {
          return;
        }

        if (!canUploadToCloud()) {
          this.setData({
            'itemForm.imageUrl': filePath,
          });
          return;
        }

        this.setData({
          uploading: true,
        });
        wx.showLoading({
          title: '上传中',
          mask: true,
        });

        wx.cloud
          .uploadFile({
            cloudPath: createCloudImagePath(filePath),
            filePath: filePath,
          })
          .then((uploadResult) => {
            if (!uploadResult.fileID) {
              throw new Error('没有拿到图片地址');
            }

            this.setData({
              'itemForm.imageUrl': uploadResult.fileID,
            });
          })
          .catch((error) => {
            wx.showToast({
              title: error.message || '上传图片失败',
              icon: 'none',
            });
          })
          .finally(() => {
            wx.hideLoading();
            this.setData({
              uploading: false,
            });
          });
      },
      fail: (error) => {
        if (error && /cancel/i.test(String(error.errMsg || ''))) {
          return;
        }

        wx.showToast({
          title: '选择图片失败',
          icon: 'none',
        });
      },
    });
  },

  removeImage() {
    this.setData({
      'itemForm.imageUrl': getPresetImage(this.data.itemForm.art),
    });
  },

  saveItem() {
    if (this.data.saving) {
      return;
    }

    const item = Object.assign({}, this.data.itemForm, {
      id: this.data.itemId || this.data.itemForm.id,
      categoryName: getCategoryName(this.data.itemForm.category),
      sort: Number(this.data.itemForm.sort || 100),
    });

    this.setData({
      saving: true,
    });
    wx.showLoading({
      title: '保存中',
      mask: true,
    });

    menuService
      .saveMenuItem(item, this.data.adminPin)
      .then(() => {
        wx.hideLoading();
        wx.showToast({
          title: '已保存',
          icon: 'success',
        });
        setTimeout(() => {
          this.goBack();
        }, 300);
      })
      .catch((error) => {
        wx.hideLoading();
        wx.showToast({
          title: error.message || '保存失败',
          icon: 'none',
        });
      })
      .finally(() => {
        this.setData({
          saving: false,
        });
      });
  },

  goBack() {
    const pages = getCurrentPages();

    if (pages.length > 1) {
      wx.navigateBack({
        delta: 1,
      });
      return;
    }

    wx.reLaunch({
      url: '/pages/admin/admin?tab=menu',
    });
  },
});
