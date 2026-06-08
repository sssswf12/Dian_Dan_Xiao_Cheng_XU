const STATUS_META = {
  pending: { text: '待确认', className: 'status-pending' },
  accepted: { text: '制作中', className: 'status-accepted' },
  ready: { text: '可取餐', className: 'status-ready' },
  completed: { text: '已完成', className: 'status-completed' },
  cancelled: { text: '已取消', className: 'status-cancelled' },
};

function pad(value) {
  return Number(value) < 10 ? '0' + Number(value) : String(value);
}

function formatPrice(cents) {
  const value = Number(cents || 0) / 100;
  return value % 1 === 0 ? String(value.toFixed(0)) : value.toFixed(2);
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

function todayKey(input) {
  const date = input ? new Date(input) : new Date();

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('');
}

function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.pending;
}

module.exports = {
  STATUS_META,
  formatPrice,
  formatDate,
  getStatusMeta,
  todayKey,
};
