export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidPhone = (phone: string): boolean =>
  /^(0|\+84)[0-9]{9}$/.test(phone);

export const isRequired = (value: string): boolean => value.trim().length > 0;
