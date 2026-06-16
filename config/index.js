const CLOUD_ENV_ID = '';

// Only used when CLOUD_ENV_ID is empty for local preview.
// For production cloud mode, set ADMIN_PIN in the cloud function environment.
const ADMIN_ACCOUNT = 'admin';
const ADMIN_PASSWORD = '040815';
const ADMIN_PIN = ADMIN_PASSWORD;

const SHOP = {
  name: '家庭点单',
  subtitle: '今天想吃什么',
  notice: '家庭内部点单，不需要支付，提交后由管理员确认。',
  serviceNote: '适合饮品、菜品、甜品、水果和日常需求。',
};

const DEFAULT_USERS = [];

module.exports = {
  CLOUD_ENV_ID,
  USE_CLOUD: Boolean(CLOUD_ENV_ID),
  ADMIN_ACCOUNT,
  ADMIN_PASSWORD,
  ADMIN_PIN,
  SHOP,
  DEFAULT_USERS,
};
