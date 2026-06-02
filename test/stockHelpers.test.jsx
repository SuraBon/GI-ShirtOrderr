import {
  applyStockMovement,
  getBatchStatusStockMovements,
  adjustStockForStatusChange,
  findStockIssuesForStatusChange,
  getClothingStockRows,
  setClothingStockRows,
} from '../src/lib/stockHelpers';
import {
  ORDER_STATUS_DELIVERED,
  ORDER_STATUS_PENDING,
  ORDER_STATUS_CANCELED,
} from '../src/lib/orderState';

describe('stock movement helpers', () => {
  const clothingConfig = [
    {
      type: 'polo',
      genderSizeRows: {
        ชาย: [{ size: 'L', qty: 10 }],
      },
    },
  ];

  const deliveredBatch = {
    orders: [
      {
        name: 'Employee A',
        gender: 'ชาย',
        items: [
          { type: 'polo', size: 'L', qty: '3', status: ORDER_STATUS_PENDING },
        ],
      },
    ],
  };

  it('deducts stock when a batch transitions to delivered', () => {
    const movements = getBatchStatusStockMovements(deliveredBatch, ORDER_STATUS_DELIVERED);
    expect(movements).toEqual([
      {
        type: 'polo',
        gender: 'ชาย',
        size: 'L',
        qty: 3,
        delta: -3,
        currentStatus: ORDER_STATUS_PENDING,
      },
    ]);

    const nextConfig = adjustStockForStatusChange(clothingConfig, deliveredBatch, ORDER_STATUS_DELIVERED);
    expect(nextConfig[0].genderSizeRows.ชาย[0].qty).toBe(7);
  });

  it('restores stock when a batch transitions away from delivered', () => {
    const deliveredConfig = [
      {
        type: 'polo',
        genderSizeRows: {
          ชาย: [{ size: 'L', qty: 7, stockWithdrawn: 3 }],
        },
      },
    ];
    const deliveredBatchState = {
      orders: [
        {
          name: 'Employee A',
          gender: 'ชาย',
          items: [
            { type: 'polo', size: 'L', qty: '3', status: ORDER_STATUS_DELIVERED },
          ],
        },
      ],
    };

    const nextConfig = adjustStockForStatusChange(deliveredConfig, deliveredBatchState, ORDER_STATUS_PENDING);
    expect(nextConfig[0].genderSizeRows.ชาย[0].qty).toBe(10);
    expect(nextConfig[0].genderSizeRows.ชาย[0].stockWithdrawn).toBe(0);
  });

  it('detects stock issues before delivering a batch', () => {
    const lowStockBatch = {
      orders: [
        {
          name: 'Employee A',
          gender: 'ชาย',
          items: [
            { type: 'polo', size: 'L', qty: '11', status: ORDER_STATUS_PENDING },
          ],
        },
      ],
    };

    const issues = findStockIssuesForStatusChange(clothingConfig, lowStockBatch, ORDER_STATUS_DELIVERED);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('ต้องการ 11 ชิ้น แต่มีสต๊อก 10 ชิ้น');
  });

  it('does not create stock issues when transitioning away from delivered', () => {
    const issues = findStockIssuesForStatusChange(clothingConfig, deliveredBatch, ORDER_STATUS_PENDING);
    expect(issues).toHaveLength(0);
  });

  it('uses sizeRows fallback when genderSizeRows is missing', () => {
    const simpleConfig = [
      { type: 'polo', sizeRows: [{ size: 'L', qty: 10 }] },
    ];

    expect(getClothingStockRows(simpleConfig[0], 'ชาย')).toEqual([{ size: 'L', qty: 10 }]);
    const updated = setClothingStockRows(simpleConfig[0], 'ชาย', [{ size: 'L', qty: 7 }]);
    expect(updated.sizeRows).toEqual([{ size: 'L', qty: 7 }]);
    expect(updated.genderSizeRows).toBeUndefined();
  });

  it('updates stock in sizeRows directly when only sizeRows exist', () => {
    const simpleConfig = [
      { type: 'polo', sizeRows: [{ size: 'L', qty: 10 }] },
    ];
    const nextConfig = adjustStockForStatusChange(simpleConfig, deliveredBatch, ORDER_STATUS_DELIVERED);

    expect(nextConfig[0].sizeRows[0].qty).toBe(7);
    expect(nextConfig[0].genderSizeRows).toBeUndefined();
  });
});
