import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const PHONE_LENGTH = 10;

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function phoneDigitsOnly(value) {
  return digitsOnly(value).slice(0, PHONE_LENGTH);
}

export function formatPhone(value) {
  const phone = phoneDigitsOnly(value);
  if (phone.length <= 3) return phone;
  if (phone.length <= 6) return `${phone.slice(0, 3)}-${phone.slice(3)}`;
  return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
}

export function compareSizes(a, b) {
  const order = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
  const aIndex = order.indexOf(String(a).toUpperCase());
  const bIndex = order.indexOf(String(b).toUpperCase());
  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  }
  return String(a).localeCompare(String(b), 'th', { numeric: true });
}

export function uniqueSorted(values, sorter) {
  const unique = [...new Set(values.filter(Boolean))];
  return sorter
    ? unique.sort(sorter)
    : unique.sort((a, b) => String(a).localeCompare(String(b), 'th', { numeric: true }));
}

export function formatMonthLabel(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(date);
}

export function formatMonthInputValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getFullYear() * 100 + date.getMonth() + 1;
}

export function getMonthKeyFromInput(value) {
  if (!value) return 0;
  const [year, month] = String(value).split('-').map(Number);
  if (!year || !month) return 0;
  return year * 100 + month;
}

export function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function buildCsvFilename(branch, startMonth, endMonth) {
  const cleanBranch = branch === 'ทุกสาขา' ? 'all-branches' : branch.replace(/[\\/:*?"<>|]/g, '-');
  const range = startMonth && endMonth ? `${startMonth}_to_${endMonth}` : 'all-months';
  return `uniform-orders_${cleanBranch}_${range}.csv`;
}
