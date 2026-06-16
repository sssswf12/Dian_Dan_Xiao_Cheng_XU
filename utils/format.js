const STATUS_META = {
  pending: { text: '待确认', className: 'status-pending' },
  confirmed: { text: '已确认', className: 'status-confirmed' },
  completed: { text: '已完成', className: 'status-completed' },
  cancelled: { text: '已取消', className: 'status-cancelled' },
  accepted: { text: '已确认', className: 'status-confirmed' },
  ready: { text: '已确认', className: 'status-confirmed' },
};

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
  formatDate,
  getStatusMeta,
  todayKey,
};
