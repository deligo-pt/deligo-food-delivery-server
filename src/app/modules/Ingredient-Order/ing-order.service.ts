import httpStatus from 'http-status';
import mongoose from 'mongoose';
import axios from 'axios';
import AppError from '../../errors/AppError';
import config from '../../config';
import { Transaction } from '../Transaction/transaction.model';
import { NotificationService } from '../Notification/notification.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { IngredientOrder } from './ing-order.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { Vendor } from '../Vendor/vendor.model';
import { searchableFields } from './ing-order.constant';
import { formatDateTime } from '../../utils/formatDateTime';
import customNanoId from '../../utils/customNanoId';

// confirm ingredient order after reduniq payment success
const confirmIngredientOrder = async (
  payload: { orderId: string; paymentToken: string },
  currentUser: TCurrentUser,
) => {
  const { orderId, paymentToken } = payload;

  const existingOrder = await IngredientOrder.findById(orderId).setOptions({
    skipFilter: true,
  });

  if (!existingOrder) {
    throw new AppError(httpStatus.NOT_FOUND, 'Ingredient order not found');
  }

  if (existingOrder.vendorId.toString() !== currentUser._id.toString()) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Unauthorized to complete this order',
    );
  }

  if (existingOrder.paymentStatus === 'PAID') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Order already paid and confirmed',
    );
  }

  const verifyPayload = {
    method: 'getResult',
    api: {
      username: config.redUniq.username,
      password: config.redUniq.password,
    },
    token: paymentToken,
  };

  const verifyRes = await axios.post(
    config.redUniq.api_url as string,
    verifyPayload,
  );

  const paymentData = verifyRes.data;

  if (
    !paymentData ||
    !paymentData.transaction ||
    paymentData.transaction.status !== '4'
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Payment verification failed. Transaction not successful.',
    );
  }

  const gatewayTransactionId = paymentData.transaction.id;
  const uniqueOrderId = `ING-ORD-${customNanoId(10)}`;

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    existingOrder.paymentStatus = 'PAID';
    existingOrder.transactionId = gatewayTransactionId;
    existingOrder.orderStatus = 'CONFIRMED';
    existingOrder.orderId = uniqueOrderId;

    await existingOrder.save({ session });

    if (typeof Transaction !== 'undefined') {
      await Transaction.create(
        [
          {
            transactionId: gatewayTransactionId,
            orderId: existingOrder._id,
            userId: currentUser?._id,
            userModel: 'Vendor',
            totalAmount: existingOrder.grandTotal,
            type: 'INGREDIENT_PURCHASE',
            status: 'SUCCESS',
            paymentMethod: existingOrder.paymentMethod,
            remarks: `Ingredient purchase successful: ${uniqueOrderId}`,
          },
        ],
        { session },
      );
    }

    await session.commitTransaction();

    const itemsCount = existingOrder.orderDetails.reduce(
      (acc, item) => acc + item.quantity,
      0,
    );
    const adminNotification = {
      title: 'New Ingredient Purchase',
      body: `Vendor ${currentUser.name?.firstName || 'Business'} purchased ${itemsCount} items. Order ID: ${uniqueOrderId}`,
      data: {
        orderId: existingOrder._id.toString(),
        type: 'INGREDIENT_ORDER',
      },
    };

    NotificationService.sendToRole(
      'Admin',
      ['ADMIN', 'SUPER_ADMIN'],
      adminNotification.title,
      adminNotification.body,
      adminNotification.data,
    );

    return existingOrder;
  } catch (err: unknown) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    const errorMessage =
      err instanceof Error ? err.message : 'Failed to confirm order';
    throw new AppError(httpStatus.BAD_REQUEST, errorMessage);
  } finally {
    session.endSession();
  }
};

// Vendor can view their orders (with filters, pagination) - only paid and confirmed orders
const getMyIngredientOrders = async (
  query: Record<string, unknown>,
  currentUser: TCurrentUser,
) => {
  const vendorInfo = await Vendor.findById(currentUser._id);
  if (!vendorInfo) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  const ingredientOrderQuery = new QueryBuilder(
    IngredientOrder.find({
      vendor: vendorInfo._id,
      isDeleted: false,
      isPaid: true,
      paymentStatus: 'PAID',
      orderStatus: { $ne: 'PENDING' }, // Exclude orders that are still pending
      orderId: { $exists: true }, // Ensure we only get orders that have been confirmed and have an orderId
    }).populate('orderDetails.ingredient'),
    query,
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await ingredientOrderQuery.modelQuery;
  const meta = await ingredientOrderQuery.countTotal();

  return {
    meta,
    data: result,
  };
};

// Admin can view all orders (with filters, pagination) - only paid and confirmed orders
const getAllIngredientOrdersForAdmin = async (
  query: Record<string, unknown>,
) => {
  const ingredientOrderQuery = new QueryBuilder(
    IngredientOrder.find({
      isDeleted: false,
      isPaid: true,
      paymentStatus: 'PAID',
      orderStatus: { $ne: 'PENDING' }, // Exclude orders that are still pending
      orderId: { $exists: true }, // Ensure we only get orders that have been confirmed and have an orderId
    })
      .populate('orderDetails.ingredient')
      .populate('vendor'),
    query,
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await ingredientOrderQuery.modelQuery;
  const meta = await ingredientOrderQuery.countTotal();

  return {
    meta,
    data: result,
  };
};

// get single order details (only if it's paid and confirmed)
const getSingleIngredientOrder = async (orderId: string) => {
  const result = await IngredientOrder.findOne({
    orderId,
    isDeleted: false,
    isPaid: true,
    paymentStatus: 'PAID',
  })
    .populate('vendor')
    .populate('orderDetails.ingredient');

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Ingredient order not found');
  }
  const order = result.toObject();

  // Mapping Logic
  const timeline = [
    {
      status: 'CONFIRMED',
      date: formatDateTime(order.createdAt),
      completed: true,
    },
    {
      status: 'SHIPPED',
      date: formatDateTime(order.statusHistory?.shippedAt),
      completed: !!order.statusHistory?.shippedAt,
    },
    {
      status: 'DELIVERED',
      date: formatDateTime(order.statusHistory?.deliveredAt),
      completed: !!order.statusHistory?.deliveredAt,
    },
  ];

  return {
    ...order,
    timeline,
  };
};

// update order status (SHIPPED, DELIVERED) - only Admin can do this
const updateIngredientOrderStatus = async (
  id: string,
  status: 'SHIPPED' | 'DELIVERED',
  currentUser: TCurrentUser,
) => {
  const adminId = currentUser._id;
  if (!adminId) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Unauthorized to update order status',
    );
  }

  const order = await IngredientOrder.findById(id);

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found');
  }

  if (order.paymentStatus !== 'PAID') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot update status of an unpaid order',
    );
  }

  const updatedData: Record<string, unknown> = {
    orderStatus: status,
    admin: adminId,
  };

  // Store the specific date for the timeline
  if (status === 'SHIPPED') updatedData['statusHistory.shippedAt'] = new Date();
  if (status === 'DELIVERED')
    updatedData['statusHistory.deliveredAt'] = new Date();

  const result = await IngredientOrder.findByIdAndUpdate(id, updatedData, {
    new: true,
  });

  return result;
};

export const IngredientOrderService = {
  confirmIngredientOrder,
  getMyIngredientOrders,
  getAllIngredientOrdersForAdmin,
  getSingleIngredientOrder,
  updateIngredientOrderStatus,
};
