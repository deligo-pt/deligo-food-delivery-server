import httpStatus from 'http-status';
import mongoose from 'mongoose';
import axios from 'axios';
import AppError from '../../errors/AppError';
import config from '../../config';
import { Transaction } from '../Transaction/transaction.model';
import { NotificationService } from '../Notification/notification.service';
import { AuthUser } from '../../constant/user.constant';
import { IngredientOrder } from './ing-order.model';
import { Ingredient } from '../Ingredients/ingredients.model';
import { IIngredients } from '../Ingredients/ingredients.interface';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { Vendor } from '../Vendor/vendor.model';
import { searchableFields } from './ing-order.constant';
import { formatDateTime } from '../../utils/formatDateTime';
import customNanoId from '../../utils/customNanoId';

// confirm ingredient order after reduniq payment success
const confirmIngredientOrder = async (
  payload: { orderId: string; paymentToken: string },
  currentUser: AuthUser,
) => {
  const { orderId, paymentToken } = payload;

  // 1. Find the initiated order (in PROCESSING state)
  const existingOrder = await IngredientOrder.findById(orderId).populate(
    'orderDetails.ingredient',
  );
  if (!existingOrder) {
    throw new AppError(httpStatus.NOT_FOUND, 'Ingredient order not found');
  }

  // 2. Security Check: Ensure the person completing is the one who initiated
  if (existingOrder.vendor.toString() !== currentUser._id.toString()) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Unauthorized to complete this order',
    );
  }

  // 3. Prevent double processing
  if (existingOrder.paymentStatus === 'PAID') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Order already paid and confirmed',
    );
  }
  const ingredientData = existingOrder.orderDetails
    .ingredient as Partial<IIngredients>;

  // 4. Verify Payment with Reduniq (getResult)
  const verifyPayload = {
    method: 'getResult',
    api: {
      username: config.reduniq.username,
      password: config.reduniq.password,
    },
    token: paymentToken,
  };

  const verifyRes = await axios.post(
    config.reduniq.api_url as string,
    verifyPayload,
  );

  const paymentData = verifyRes.data;

  // Status "4" usually indicates a successful authorized/captured transaction in Reduniq
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

  const transactionId = paymentData.transaction.id;
  const uniqueOrderId = `ING-ORD-${customNanoId(10)}`;

  // --- Start Database Transaction ---
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Update the Order Status
    existingOrder.paymentStatus = 'PAID';
    existingOrder.isPaid = true;
    existingOrder.transactionId = transactionId;
    existingOrder.orderStatus = 'CONFIRMED';
    existingOrder.orderId = uniqueOrderId; // Generate the final readable Order ID

    await existingOrder.save({ session });

    // 2. Stock Management (Atomic update)
    // We check if stock is sufficient within the update to prevent race conditions
    const updatedIngredient = await Ingredient.findOneAndUpdate(
      {
        _id: existingOrder.orderDetails.ingredient,
        stock: { $gte: existingOrder.orderDetails.totalQuantity },
      },
      { $inc: { stock: -existingOrder.orderDetails.totalQuantity } },
      { session, new: true },
    );

    if (!updatedIngredient) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Insufficient stock to complete the purchase',
      );
    }

    // 3. Create General Transaction Record (if your system uses a Transaction model)
    await Transaction.create(
      [
        {
          transactionId: transactionId,
          orderId: existingOrder._id,
          userId: currentUser?._id,
          userModel: 'Vendor',
          totalAmount: existingOrder.grandTotal,
          type: 'INGREDIENT_PURCHASE',
          status: 'SUCCESS',
          paymentMethod: existingOrder.paymentMethod,
          remarks: `Ingredient purchase successful: ${existingOrder.orderId}`,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    // 4. Post-confirmation logic (Notifications)
    const adminNotification = {
      title: 'New Ingredient Purchase',
      body: `Vendor ${currentUser.name.firstName} purchased ${existingOrder.orderDetails.totalQuantity}x ${ingredientData?.name}. Order ID: ${uniqueOrderId}`,
      data: {
        orderId: existingOrder._id.toString(),
        type: 'INGREDIENT_ORDER',
      },
    };

    // Assuming you have a method to find Admins or send to all Admins
    NotificationService.sendToRole(
      'Admin',
      ['ADMIN', 'SUPER_ADMIN'],
      adminNotification.title,
      adminNotification.body,
      adminNotification.data,
    );

    return existingOrder;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// Vendor can view their orders (with filters, pagination) - only paid and confirmed orders
const getMyIngredientOrders = async (
  query: Record<string, unknown>,
  currentUser: AuthUser,
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
  currentUser: AuthUser,
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

  if (!order.isPaid) {
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
