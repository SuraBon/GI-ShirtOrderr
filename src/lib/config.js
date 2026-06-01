import { getAdminToken } from './api';
import { digitsOnly } from './utils';

export const CLOTHING_CONFIG_KEY = 'gi-shirt-clothing-config';
export const CLOTHING_SIZE_TABLE_VERSION_KEY = 'gi-shirt-clothing-size-table-version';
export const CLOTHING_SIZE_TABLE_VERSION = '2026-05-standard-shirt-table-v2';
export const IMAGE_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const CLOTHING_TYPES = ['เสื้อโปโล', 'เสื้อช็อป', 'กางเกงช็อป'];
export const GENDERS = ['ชาย', 'หญิง'];
export const OTHER_SIZE = 'อื่นๆ';

export const SIZE_TABLES = {
  'เสื้อโปโล ชาย': [
    ['S', '38"'],
    ['M', '40"'],
    ['L', '42"'],
    ['XL', '44"'],
    ['2XL', '46"'],
    ['3XL', '48"'],
    ['4XL', '50"'],
    ['5XL', '52"'],
  ],
  'เสื้อโปโล หญิง': [
    ['S', '34"'],
    ['M', '36"'],
    ['L', '38"'],
    ['XL', '40"'],
    ['2XL', '42"'],
    ['3XL', '44"'],
  ],
  เสื้อช็อป: [
    ['S', '38"'],
    ['M', '40"'],
    ['L', '42"'],
    ['XL', '44"'],
    ['2XL', '46"'],
    ['3XL', '48"'],
    ['4XL', '50"'],
    ['5XL', '52"'],
  ],
  กางเกงช็อป: [
    ['28”', ''],
    ['30”', ''],
    ['32”', '3'],
    ['34”', '3'],
    ['36”', ''],
    ['38”', '3'],
    ['40”', ''],
    ['42”', '3'],
    ['44”', ''],
  ],
};

export function getStandardSizeSource(type, gender) {
  if (type === 'เสื้อโปโล')
    return SIZE_TABLES[`เสื้อโปโล ${gender}`] || SIZE_TABLES['เสื้อโปโล ชาย'];
  return SIZE_TABLES[type] || [];
}

export function getStandardDetailFields(type) {
  return type === 'กางเกงช็อป' ? ['จำนวน'] : ['อก'];
}

export function buildStandardSizeRows(type, gender) {
  const detailField = getStandardDetailFields(type)[0];
  return getStandardSizeSource(type, gender).map(([size, measure]) => ({
    size,
    details: { [detailField]: measure },
    qty: 0,
  }));
}

export function buildDefaultClothingItem(type, item = {}) {
  const detailFields = getStandardDetailFields(type);
  const genderSizeRows = GENDERS.reduce(
    (rows, gender) => ({
      ...rows,
      [gender]: buildStandardSizeRows(type, gender),
    }),
    {}
  );
  return {
    id: item.id || crypto.randomUUID(),
    type,
    imageUrl: item.imageUrl || '',
    colors: Array.isArray(item.colors) ? item.colors : [],
    detailFields,
    sizeRows: genderSizeRows[GENDERS[0]],
    genderSizeRows,
  };
}

export const DEFAULT_CLOTHING_CONFIG = CLOTHING_TYPES.map((type) => buildDefaultClothingItem(type));

export function normalizeSizeDetails(row, detailFields) {
  if (row?.details && typeof row.details === 'object') {
    return detailFields.reduce(
      (details, field) => ({ ...details, [field]: String(row.details[field] || '') }),
      {}
    );
  }
  const fallback = String(row?.measure || '').trim();
  return detailFields.reduce(
    (details, field, index) => ({ ...details, [field]: index === 0 ? fallback : '' }),
    {}
  );
}

export function normalizeSizeRows(rows, detailFields) {
  const normalizedRows =
    Array.isArray(rows) && rows.length
      ? rows.map((row) => ({
          size: String(row?.size || '').trim(),
          details: normalizeSizeDetails(row, detailFields),
          qty: Number(row?.qty || 0),
        }))
      : [];
  return normalizedRows.length
    ? normalizedRows
    : [{ size: 'M', details: normalizeSizeDetails({}, detailFields), qty: 0 }];
}

export function normalizeClothingConfig(config) {
  const source = Array.isArray(config) && config.length ? config : DEFAULT_CLOTHING_CONFIG;
  return source
    .map((item, index) => {
      const type = String(item?.type || CLOTHING_TYPES[index] || 'เสื้อ').trim();
      const detailFields =
        Array.isArray(item?.detailFields) && item.detailFields.length
          ? item.detailFields.map((field) => String(field || '').trim()).filter(Boolean)
          : [String(item?.detailLabel || (type.includes('กางเกง') ? 'เอว' : 'อก')).trim()];
      const fallbackRows = normalizeSizeRows(item?.sizeRows, detailFields);
      const genderSizeRows = GENDERS.reduce(
        (genderRows, gender) => ({
          ...genderRows,
          [gender]: normalizeSizeRows(item?.genderSizeRows?.[gender] || fallbackRows, detailFields),
        }),
        {}
      );

      return {
        id: item?.id || crypto.randomUUID(),
        type,
        imageUrl: item?.imageUrl || '',
        colors: Array.isArray(item?.colors)
          ? item.colors.map((color) => ({
              name: String(color?.name || '').trim(),
              value: String(color?.value || '#0F172A').trim() || '#0F172A',
            }))
          : [],
        detailFields,
        sizeRows: genderSizeRows[GENDERS[0]] || fallbackRows,
        genderSizeRows,
      };
    })
    .filter((item) => item.type);
}

export function migrateStandardSizeTables(config) {
  const normalized = normalizeClothingConfig(config);
  const standardTypes = new Set(CLOTHING_TYPES);
  const byType = new Map(normalized.map((item) => [item.type, item]));
  const migratedStandardItems = CLOTHING_TYPES.map((type) =>
    buildDefaultClothingItem(type, byType.get(type))
  );
  const customItems = normalized.filter((item) => !standardTypes.has(item.type));
  return [...migratedStandardItems, ...customItems];
}

export function readClothingConfig() {
  try {
    const normalized = normalizeClothingConfig(
      JSON.parse(localStorage.getItem(CLOTHING_CONFIG_KEY) || 'null')
    );
    if (localStorage.getItem(CLOTHING_SIZE_TABLE_VERSION_KEY) !== CLOTHING_SIZE_TABLE_VERSION) {
      const migrated = migrateStandardSizeTables(normalized);
      localStorage.setItem(CLOTHING_CONFIG_KEY, JSON.stringify(migrated));
      localStorage.setItem(CLOTHING_SIZE_TABLE_VERSION_KEY, CLOTHING_SIZE_TABLE_VERSION);
      return migrated;
    }
    return normalized;
  } catch {
    const migrated = migrateStandardSizeTables();
    localStorage.setItem(CLOTHING_SIZE_TABLE_VERSION_KEY, CLOTHING_SIZE_TABLE_VERSION);
    return migrated;
  }
}

export function saveClothingConfig(config) {
  localStorage.setItem(CLOTHING_CONFIG_KEY, JSON.stringify(normalizeClothingConfig(config)));
}

export async function loadSharedClothingConfig() {
  const response = await fetch('/api/blob/config', { cache: 'no-store' });
  if (!response.ok) throw new Error('Shared clothing config is not available');
  const data = await response.json();
  if (!Array.isArray(data?.config) || !data.config.length) return null;
  const normalized = migrateStandardSizeTables(data.config);
  saveClothingConfig(normalized);
  localStorage.setItem(CLOTHING_SIZE_TABLE_VERSION_KEY, CLOTHING_SIZE_TABLE_VERSION);
  return normalized;
}

export async function publishSharedClothingConfig(config) {
  const normalized = normalizeClothingConfig(config);
  const token = getAdminToken();
  const response = await fetch('/api/blob/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ config: normalized }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const error = new Error(data?.error || 'Shared clothing config sync failed');
    error.status = response.status;
    throw error;
  }
  return normalized;
}

export function getClothingTypes() {
  return readClothingConfig().map((item) => item.type);
}

export function findClothingConfig(type) {
  return readClothingConfig().find((item) => item.type === type);
}

export function getColorOptions(type) {
  const clothing = findClothingConfig(type);
  return (clothing?.colors || []).map((color) => color.name).filter(Boolean);
}

export function needsColorSelection(type) {
  return getColorOptions(type).length > 1;
}

export function resolveItemColor(type, color = '') {
  const colors = getColorOptions(type);
  if (colors.length === 1) return colors[0];
  return colors.includes(color) ? color : '';
}

export function getSizeRows(type, gender) {
  const clothing = findClothingConfig(type);
  const genderRows = clothing?.genderSizeRows?.[gender];
  if (genderRows?.length)
    return genderRows.map((row) => [
      row.size,
      Object.values(row.details || {})
        .filter(Boolean)
        .join(' / ') || row.size,
    ]);
  if (clothing?.sizeRows?.length)
    return clothing.sizeRows.map((row) => [
      row.size,
      Object.values(row.details || {})
        .filter(Boolean)
        .join(' / ') || row.size,
    ]);
  if (type === 'เสื้อโปโล') return SIZE_TABLES[`เสื้อโปโล ${gender}`] || [];
  return SIZE_TABLES[type] || [];
}

export function getSizeOptions(type, gender) {
  return [...getSizeRows(type, gender).map(([size]) => size), OTHER_SIZE];
}

export function getSizeOptionsWithLabels(type, gender) {
  if (!gender) return [];
  const options = getSizeRows(type, gender).map(([size]) => [size, size]);
  return [...options, [OTHER_SIZE, OTHER_SIZE]];
}

export function defaultSize(type, gender) {
  return getSizeOptions(type, gender)[1] || 'M';
}

export function patchSizeWithDefaultQty(item, size) {
  return {
    size,
    customSize: size === OTHER_SIZE ? item.customSize : '',
    qty: item.qty || 2,
  };
}
