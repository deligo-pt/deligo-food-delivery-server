import { z } from 'zod';
import { PICKUP_CODE_LENGTH } from './order.constant';

// update order status by vendor validation (accepted, rejected, preparing, ready for pickup, canceled, no-show)
const updateOrderStatusByVendorValidationSchema = z.object({
  body: z
    .object({
      type: z.enum(
        [
          'ACCEPTED',
          'REJECTED',
          'PREPARING',
          'READY_FOR_PICKUP',
          'CANCELED',
          'NO_SHOW',
        ],
        {
          required_error: 'Action type is required',
        },
      ),
      reason: z.string().optional(),
    })
    .strict(),
});

// vendor verifies the customer's self-pickup code at the counter
const verifyPickupCodeValidationSchema = z.object({
  body: z
    .object({
      code: z
        .string({ required_error: 'Pickup code is required' })
        .length(
          PICKUP_CODE_LENGTH,
          `Pickup code must be ${PICKUP_CODE_LENGTH} digits`,
        ),
    })
    .strict(),
});

// update order status by delivery partner validation schema (reassignment needed, on the way, delivered)
const updateOrderStatusByDeliveryPartnerValidationSchema = z.object({
  body: z
    .object({
      orderStatus: z.enum(
        ['REASSIGNMENT_NEEDED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'],
        { required_error: 'Order status is required' },
      ),
      deliveryProofImage: z.string().optional(),
      reason: z.string().optional(),
    })
    .strict()
    .refine(
      (data) => {
        if (data.orderStatus === 'DELIVERED') {
          return (
            !!data.deliveryProofImage && data.deliveryProofImage.trim() !== ''
          );
        }
        return true;
      },
      {
        message: 'Delivery proof image is required for delivered status',
        path: ['deliveryProofImage'],
      },
    ),
});

const partnerAcceptDispatchOrder = z.object({
  body: z
    .object({
      action: z.enum(['ACCEPT', 'REJECT'], {
        required_error: 'Action is required',
      }),
    })
    .strict(),
});

// cancel order by customer validation
const cancelOrderByCustomerValidationSchema = z.object({
  body: z
    .object({
      reason: z
        .string({ required_error: 'Cancel reason is required' })
        .min(1, 'Cancel reason is required'),
    })
    .strict(),
});

export const OrderValidation = {
  updateOrderStatusByVendorValidationSchema,
  updateOrderStatusByDeliveryPartnerValidationSchema,
  partnerAcceptDispatchOrder,
  cancelOrderByCustomerValidationSchema,
  verifyPickupCodeValidationSchema,
};
