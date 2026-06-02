import { BRANCHES } from '../constants/branches';
import {
  OTHER_SIZE,
  getSizeOptions,
  getClothingTypes,
  defaultSize,
} from './config';
import { digitsOnly } from './utils';

export const DEFAULT_COMPANY_NAME = 'โกลด์ อินทิเกรท จำกัด';
export const ORDER_STATUS_PENDING = 'รอจัดส่ง';
export const ORDER_STATUS_DELIVERED = 'จัดส่งแล้ว';
export const ORDER_STATUSES = [ORDER_STATUS_PENDING, ORDER_STATUS_DELIVERED];

export function createEmployee(index = 0) {
  return {
    id: crypto.randomUUID(),
    employeeId: '',
    name: '',
    gender: '',
    expanded: index === 0,
    items: [],
  };
}

export function createOrderItem(type, gender, size = '', qty = 2) {
  const options = gender ? getSizeOptions(type, gender) : [];
  const nextSize = size && options.includes(size) ? size : gender ? defaultSize(type, gender) : '';
  return {
    type,
    size: nextSize,
    customSize: '',
    qty: digitsOnly(qty || 2),
  };
}

export function createQuickOrderItems({ gender, defaultSizeValue, customItems }) {
  const sourceItems = getClothingTypes()
    .map((type, index) => ({
      type,
      qty: customItems?.[index]?.qty || 2,
      enabled: Boolean(customItems?.[index]?.enabled),
    }))
    .filter((item) => item.enabled);

  return sourceItems.map((item) => createOrderItem(item.type, gender, defaultSizeValue, item.qty));
}

export function createEmployeeFromQuickOrder(name, index, quickOrder) {
  return {
    ...createEmployee(index),
    name,
    gender: quickOrder.gender,
    expanded: index === 0,
    items: createQuickOrderItems(quickOrder),
  };
}

export function createInitialOrderState() {
  return {
    companyName: DEFAULT_COMPANY_NAME,
    branch: BRANCHES[0],
    supervisorName: '',
    supervisorPhone: '',
    employees: Array.from({ length: 1 }, (_, index) => createEmployee(index)),
  };
}

export function canDeleteEmployee(employees) {
  return employees.length > 1;
}

export function orderReducer(state, action) {
  switch (action.type) {
    case 'patchBatch':
      return { ...state, ...action.patch };
    case 'generate':
      return {
        ...state,
        employees: Array.from({ length: action.count }, (_, index) => createEmployee(index)),
      };
    case 'syncCount': {
      const count = Math.max(1, Number(action.count || 1));
      const employees = state.employees.slice(0, count);
      while (employees.length < count) employees.push(createEmployee(employees.length));
      return { ...state, employees };
    }
    case 'setNamesFromPaste': {
      const names = action.names.filter(Boolean);
      if (!names.length) return state;
      const employees = names.map((name, index) => ({
        ...(state.employees[index] || createEmployee(index)),
        name,
        expanded: index === 0,
      }));
      return { ...state, employees };
    }
    case 'applyQuickOrder': {
      const names = action.names.filter(Boolean);
      if (!names.length) return state;
      return {
        ...state,
        employees: names.map((name, index) =>
          createEmployeeFromQuickOrder(name, index, action.quickOrder)
        ),
      };
    }
    case 'copyFirstSetupToAll': {
      const source = state.employees[0];
      if (!source) return state;
      return {
        ...state,
        employees: state.employees.map((employee, index) =>
          index === 0
            ? employee
            : {
                ...employee,
                gender: source.gender,
                items: source.items.map((item) => ({ ...item })),
              }
        ),
      };
    }
    case 'removeBlankEmployees': {
      const employees = state.employees.filter(hasEmployeeData);
      return { ...state, employees: employees.length ? employees : [createEmployee(0)] };
    }
    case 'add': {
      const newEmployee = createEmployee(state.employees.length);
      if (action.id) {
        newEmployee.id = action.id;
      }
      return { ...state, employees: [...state.employees, newEmployee] };
    }
    case 'delete':
      if (!canDeleteEmployee(state.employees)) return state;
      return {
        ...state,
        employees: state.employees.filter((employee) => employee.id !== action.id),
      };
    case 'toggleExpand':
      return {
        ...state,
        employees: state.employees.map((employee) =>
          employee.id === action.id ? { ...employee, expanded: !employee.expanded } : employee
        ),
      };
    case 'focusEmployee':
      return {
        ...state,
        employees: state.employees.map((employee) => ({
          ...employee,
          expanded: employee.id === action.id,
        })),
      };
    case 'saveAndOpenNext':
      return {
        ...state,
        employees: state.employees.map((employee, index) => ({
          ...employee,
          expanded: index === action.nextIndex,
        })),
      };
    case 'patchEmployee':
      return {
        ...state,
        employees: state.employees.map((employee) => {
          if (employee.id !== action.id) return employee;
          const next = { ...employee, ...action.patch };
          if ('gender' in action.patch) {
            next.items = next.items.map((item) => ({
              ...item,
              size: '',
              customSize: '',
            }));
          }
          return next;
        }),
      };
    case 'toggleType':
      return {
        ...state,
        employees: state.employees.map((employee) => {
          if (employee.id !== action.id) return employee;
          const exists = employee.items.some((item) => item.type === action.itemType);
          const items = exists
            ? employee.items.filter((item) => item.type !== action.itemType)
            : [...employee.items, createOrderItem(action.itemType, employee.gender)];
          return { ...employee, items };
        }),
      };
    case 'patchItem':
      return {
        ...state,
        employees: state.employees.map((employee) =>
          employee.id === action.id
            ? {
                ...employee,
                items: employee.items.map((item) =>
                  item.type === action.itemType
                    ? {
                        ...item,
                        ...action.patch,
                        ...(action.patch?.type && action.patch.type !== item.type
                          ? { size: '', customSize: '' }
                          : {}),
                      }
                    : item
                ),
              }
            : employee
        ),
      };
    case 'copyEmployeeSetup': {
      const source = state.employees.find((employee) => employee.id === action.sourceId);
      if (!source) return state;
      return {
        ...state,
        employees: state.employees.map((employee) =>
          employee.id === action.id
            ? {
                ...employee,
                gender: source.gender,
                items: source.items.map((item) => ({ ...item })),
              }
            : employee
        ),
      };
    }
    case 'reset':
      return createInitialOrderState();
    default:
      return state;
  }
}

export function flattenBatches(batches) {
  return batches.flatMap((batch) =>
    batch.orders.flatMap((order) =>
      order.items.map((item, index) => ({
        id: `${batch.batchId}-${order.name}-${item.type}-${index}`,
        batchId: batch.batchId,
        submittedAt: batch.submittedAt,
        companyName: batch.companyName,
        branch: batch.branch,
        supervisorName: batch.supervisorName,
        supervisorPhone: batch.supervisorPhone,
        status: batch.status,
        statusUpdatedAt: batch.statusUpdatedAt,
        name: order.name,
        gender: order.gender,
        type: item.type,
        size: item.size,
        qty: Number(item.qty || 0),
      }))
    )
  );
}

export function normalizeBatch(batch) {
  const normalizedOrders = Array.isArray(batch.orders)
    ? batch.orders
        .map((order) => ({
          name: order.name || '-',
          gender: order.gender || '-',
          items: Array.isArray(order.items)
            ? order.items
                .map((item) => ({
                  type: item.type || '-',
                  size: item.size || '-',
                  qty: Number(item.qty || 0),
                  status:
                    item.status === ORDER_STATUS_DELIVERED ||
                    batch.status === ORDER_STATUS_DELIVERED
                      ? ORDER_STATUS_DELIVERED
                      : ORDER_STATUS_PENDING,
                  statusUpdatedAt:
                    item.statusUpdatedAt ||
                    batch.statusUpdatedAt ||
                    batch.submittedAt ||
                    new Date().toISOString(),
                }))
                .filter((item) => item.qty > 0)
            : [],
        }))
        .filter((order) => order.items.length)
    : [];

  const allItems = normalizedOrders.flatMap((o) => o.items);
  let batchStatus = batch.status === ORDER_STATUS_DELIVERED ? ORDER_STATUS_DELIVERED : ORDER_STATUS_PENDING;
  if (allItems.length > 0) {
    const uniqueStatuses = new Set(allItems.map((i) => i.status));
    if (uniqueStatuses.size === 1) {
      batchStatus = Array.from(uniqueStatuses)[0];
    } else {
      batchStatus = ORDER_STATUS_PENDING;
    }
  }

  return {
    batchId: batch.batchId || `ORD-${Date.now()}`,
    companyName: batch.companyName || '',
    branch: batch.branch || '-',
    supervisorName: batch.supervisorName || '',
    supervisorPhone: batch.supervisorPhone || '',
    submittedAt: batch.submittedAt || new Date().toISOString(),
    status: batchStatus,
    statusUpdatedAt: batch.statusUpdatedAt || batch.submittedAt || new Date().toISOString(),
    orders: normalizedOrders,
  };
}

export function buildOrderSummaryRows(employees) {
  return employees.flatMap((employee) =>
    employee.items
      .filter((item) => item.size)
      .map((item) => ({
        id: `${employee.id}-${item.type}-${item.size}`,
        name: employee.name || '-',
        type: item.type,
        size: item.size === OTHER_SIZE ? item.customSize || '-' : item.size,
        qty: Number(item.qty || 0),
      }))
  );
}

export function isEmployeeComplete(employee) {
  return Boolean(
    employee.name.trim() &&
    employee.gender &&
    employee.items.length &&
    employee.items.every(
      (item) =>
        item.size &&
        Number(item.qty || 0) > 0 &&
        (item.size !== OTHER_SIZE || item.customSize.trim())
    )
  );
}

export function getEmployeeMissingFields(employee) {
  const missing = [];
  if (!employee.name.trim()) missing.push('ชื่อ');
  if (!employee.gender) missing.push('เพศ');
  if (!employee.items.length) {
    missing.push('ประเภทเสื้อ');
    return missing;
  }

  if (employee.items.some((item) => !item.size)) missing.push('ไซส์');
  if (employee.items.some((item) => Number(item.qty || 0) <= 0)) missing.push('จำนวน');
  if (employee.items.some((item) => item.size === OTHER_SIZE && !item.customSize.trim()))
    missing.push('ระบุไซส์เพิ่มเติม');
  return missing;
}

export function hasEmployeeData(employee) {
  return Boolean(
    employee.name.trim() ||
    employee.gender ||
    employee.items.some(
      (item) => item.size || item.customSize.trim() || Number(item.qty || 0) > 0
    )
  );
}
