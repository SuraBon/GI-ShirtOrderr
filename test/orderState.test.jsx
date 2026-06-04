import { flattenBatches, normalizeBatch, orderReducer } from '../src/lib/orderState';

describe('orderReducer', () => {
  it('resets size fields when changing an item type', () => {
    const state = {
      companyName: '',
      branch: '',
      supervisorName: '',
      supervisorPhone: '',
      employees: [
        {
          id: 'employee-1',
          name: 'Test User',
          gender: 'ชาย',
          expanded: true,
          items: [
            {
              id: 'item-1',
              type: 'เสื้อโปโล',
              size: 'L',
              customSize: 'custom',
              qty: '2',
            },
          ],
        },
      ],
    };

    const nextState = orderReducer(state, {
      type: 'patchItem',
      id: 'employee-1',
      itemId: 'item-1',
      patch: { type: 'เสื้อช็อป' },
    });

    expect(nextState.employees[0].items[0]).toMatchObject({
      type: 'เสื้อช็อป',
      size: '',
      customSize: '',
      qty: '2',
    });
  });

  it('adds a blank employee row instead of copying the last row setup', () => {
    const state = {
      companyName: '',
      branch: '',
      supervisorName: '',
      supervisorPhone: '',
      employees: [
        {
          id: 'employee-1',
          name: 'A',
          gender: 'ชาย',
          expanded: true,
          items: [
            {
              type: 'เสื้อโปโล',
              size: 'L',
              customSize: '',
              qty: '1',
            },
          ],
        },
      ],
    };

    const nextState = orderReducer(state, { type: 'add', id: 'employee-2' });

    expect(nextState.employees).toHaveLength(2);
    expect(nextState.employees[1]).toMatchObject({
      id: 'employee-2',
      name: '',
      gender: '',
      items: [],
    });
  });

  it('preserves canceled item and batch statuses during normalization', () => {
    const batch = normalizeBatch({
      batchId: 'ORD-1',
      status: 'ยกเลิก',
      orders: [
        {
          name: 'Employee A',
          gender: 'ชาย',
          items: [{ type: 'เสื้อโปโล', size: 'L', qty: 1, status: 'ยกเลิก' }],
        },
      ],
    });

    expect(batch.status).toBe('ยกเลิก');
    expect(batch.orders[0].items[0].status).toBe('ยกเลิก');
  });

  it('clones an employee directly after the source row', () => {
    const state = {
      companyName: '',
      branch: '',
      supervisorName: '',
      supervisorPhone: '',
      employees: [
        {
          id: 'employee-1',
          name: 'A',
          gender: 'male',
          expanded: true,
          items: [{ type: 'polo', size: 'L', customSize: '', qty: '1' }],
        },
        {
          id: 'employee-2',
          name: 'B',
          gender: 'female',
          expanded: false,
          items: [],
        },
      ],
    };

    const nextState = orderReducer(state, { type: 'cloneEmployee', id: 'employee-1' });

    expect(nextState.employees).toHaveLength(3);
    expect(nextState.employees[1]).toMatchObject({
      name: expect.stringMatching(/^A \(.+\)$/),
      gender: 'male',
      expanded: false,
      items: [{ type: 'polo', size: 'L', customSize: '', qty: '1' }],
    });
    expect(nextState.employees[1].id).not.toBe('employee-1');
    expect(nextState.employees[2].id).toBe('employee-2');
  });

  it('keeps item status update timestamps when flattening batches', () => {
    const rows = flattenBatches([
      {
        batchId: 'ORD-1',
        submittedAt: '2026-06-01T00:00:00.000Z',
        companyName: 'Company',
        branch: 'Branch',
        supervisorName: 'Supervisor',
        supervisorPhone: '0812345678',
        status: 'pending',
        statusUpdatedAt: '2026-06-01T01:00:00.000Z',
        orders: [
          {
            name: 'Employee A',
            gender: 'male',
            items: [
              {
                type: 'polo',
                size: 'L',
                qty: 1,
                status: 'delivered',
                statusUpdatedAt: '2026-06-02T01:00:00.000Z',
              },
            ],
          },
        ],
      },
    ]);

    expect(rows[0].statusUpdatedAt).toBe('2026-06-02T01:00:00.000Z');
  });
});
