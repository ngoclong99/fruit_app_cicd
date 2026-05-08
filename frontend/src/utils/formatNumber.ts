export const formatCurrency = (amount: number, suffix = 'đ'): string =>
  amount.toLocaleString('vi-VN') + suffix;

export const formatNumber = (n: number): string => n.toLocaleString('vi-VN');
