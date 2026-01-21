import { z } from 'zod';

// update order status by vendor validation (accepted, rejected, preparing, ready for pickup, canceled)
const updateOrderStatusByVendorValidationSchema = z.object({
  body: z.object({
    type: z.enum(
      ['ACCEPTED', 'REJECTED', 'PREPARING', 'READY_FOR_PICKUP', 'CANCELED'],
      {
        required_error: 'Action type is required',
      },
    ),
    reason: z.string().optional(),
  }),
});

// update order status by delivery partner validation schema (reassignment needed, on the way, delivered)
const updateOrderStatusByDeliveryPartnerValidationSchema = z.object({
  body: z.object({
    orderStatus: z.enum(['REASSIGNMENT_NEEDED', 'ON_THE_WAY', 'DELIVERED']),
    reason: z.string().optional(),
  }),
});

const partnerAcceptDispatchOrder = z.object({
  body: z.object({
    action: z.enum(['reject']).optional(),
  }),
});

export const OrderValidation = {
  updateOrderStatusByVendorValidationSchema,
  updateOrderStatusByDeliveryPartnerValidationSchema,
  partnerAcceptDispatchOrder,
};
