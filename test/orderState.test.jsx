import { orderReducer } from '../src/lib/orderState';

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
      itemType: 'เสื้อโปโล',
      patch: { type: 'เสื้อช็อป' },
    });

    expect(nextState.employees[0].items[0]).toMatchObject({
      type: 'เสื้อช็อป',
      size: '',
      customSize: '',
      qty: '2',
    });
  });
});
