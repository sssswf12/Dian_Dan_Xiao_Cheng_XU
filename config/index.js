const CLOUD_ENV_ID = '';

// Only used when CLOUD_ENV_ID is empty for local preview.
// For production cloud mode, set ADMIN_PIN in the cloud function environment.
const ADMIN_PIN = '2468';

const SHOP = {
  name: '软糖小食铺',
  subtitle: '今日也要好好吃饭',
  notice: '无在线支付，提交订单后由店主确认制作。',
  serviceNote: '适合家庭、工作室、小型聚会的自助点单。',
};

module.exports = {
  CLOUD_ENV_ID,
  USE_CLOUD: Boolean(CLOUD_ENV_ID),
  ADMIN_PIN,
  SHOP,
};
