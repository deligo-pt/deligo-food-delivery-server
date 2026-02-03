import { TOrder } from '../modules/Order/order.interface';

export const mapOrderToSagePayload = (order: TOrder) => {
  return {
    PartyID: '1',
    TransDocument: 'FS',
    TransSerial: '1',
    StoreID: 1,
    WarehouseID: '1',
    CreateDate: new Date().toISOString(),

    Details: order.items.map((item) => ({
      ArtigoID: item.productId.toString(),
      Quantity: item.quantity,
      UnitPrice: item.price,
      Description: item.name,
      TaxCode: item.taxRate ? item.taxRate.toString() : '23',
      DiscountPercentage:
        item.discountAmount > 0
          ? (item.discountAmount / item.originalPrice) * 100
          : 0,
    })),
  };
};
