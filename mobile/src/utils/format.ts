export function formatVnd(value: number): string {
  return `${value.toLocaleString('vi-VN')}đ`;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Chờ xác nhận';
    case 'confirmed':
      return 'Đã xác nhận';
    case 'shipping':
      return 'Đang giao';
    case 'delivered':
      return 'Đã giao';
    case 'cancelled':
      return 'Đã huỷ';
    default:
      return status;
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'pending':
      return '#F97316';
    case 'confirmed':
      return '#3B82F6';
    case 'shipping':
      return '#8B5CF6';
    case 'delivered':
      return '#16A34A';
    case 'cancelled':
      return '#EF4444';
    default:
      return '#6B7280';
  }
}
