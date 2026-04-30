/* eslint-disable @typescript-eslint/no-explicit-any */
import { Transaction } from './transaction.model';
import { TOrderItemSnapshot } from '../../constant/order.constant';
import { AuthUser } from '../../constant/user.constant';
import { roundTo2 } from '../../utils/mathProvider';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { TTransaction } from './transaction.interface';
import { QueryBuilder } from '../../builder/QueryBuilder';

// get all transactions
const getMyTransactions = async (
  user: AuthUser,
  query: Record<string, unknown>,
) => {
  let filter: Record<string, unknown> = {};

  // Role-based filtering
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    const roleMapping: Record<string, string> = {
      VENDOR: 'Vendor',
      CUSTOMER: 'Customer',
      FLEET_MANAGER: 'FleetManager',
      DELIVERY_PARTNER: 'DeliveryPartner',
    };

    filter = {
      userObjectId: user._id,
      userModel: roleMapping[user.role],
    };
  }

  const queryBuilder = new QueryBuilder(
    Transaction.find(filter).populate({
      path: 'orderId',
      populate: {
        path: 'customerId',
        select: 'name',
      },
    }),
    query,
  )
    .paginate()
    .sort()
    .search(['transactionId', 'type']);

  const transactions = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();

  const data = transactions.map((txn: any) => {
    const order = txn.orderId;
    const customer = order?.customerId;

    return {
      _id: txn._id.toString(),
      transactionId: txn.transactionId,
      type: txn.type,
      status: txn.status,
      description: txn.remarks || `${txn.type.replace(/_/g, ' ')}`,

      amount: roundTo2(txn.totalAmount),
      order: order,

      orderId: order?.orderId,

      orderGrandTotal: roundTo2(order?.payoutSummary?.grandTotal),
      platformFee: roundTo2(
        order?.payoutSummary?.deliGoCommission?.totalDeduction,
      ),

      vendorNetEarning: roundTo2(order?.payoutSummary?.vendor?.vendorNetPayout),

      riderNetEarnings: roundTo2(order?.payoutSummary?.rider?.riderNetEarnings),

      fleetEarnings: roundTo2(order?.payoutSummary?.fleet?.fee),

      customer: customer || 'N/A',

      deliveryAddress: order?.deliveryAddress
        ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.country}`
        : 'N/A',

      items:
        order?.items?.map((item: TOrderItemSnapshot) => ({
          name: item.name,
          qty: item.itemSummary?.quantity || 0,
          price: item.productPricing?.unitPrice?.toFixed(2) || '0.00',
        })) || [],

      paymentMethod: txn.paymentMethod,
      createdAt: txn.createdAt.toISOString(),
      updatedAt: txn.updatedAt.toISOString(),
    };
  });

  return {
    data,
    meta,
  };
};

// get transaction by  transactionId
const getTransactionById = async (id: string) => {
  const txn = (await Transaction.findOne({ transactionId: id }).populate({
    path: 'orderId',
    populate: {
      path: 'customerId',
      select: 'name email contactNumber profilePhoto',
    },
  })) as TTransaction;

  if (!txn) {
    throw new AppError(httpStatus.NOT_FOUND, 'Transaction not found');
  }

  const order = txn.orderId as any;
  const customer = order?.customerId;

  return {
    _id: txn._id.toString(),
    transactionId: txn.transactionId,
    type: txn.type,
    status: txn.status,
    description: txn.remarks || `${txn.type.replace(/_/g, ' ')}`,

    // Basic Amounts
    amount: roundTo2(txn.totalAmount),

    // Order context
    orderId: order?.orderId,
    // -> admin
    orderGrandTotal: roundTo2(order?.payoutSummary?.grandTotal),
    platformFee: roundTo2(
      order?.payoutSummary?.deliGoCommission?.totalDeduction,
    ),
    // -> vendor
    vendorNetEarning: roundTo2(order?.payoutSummary?.vendor?.vendorNetPayout),
    // -> delivery partner
    riderNetEarnings: order?.payoutSummary?.rider?.riderNetEarnings,
    // -> fleet manager
    fleetEarnings: order?.payoutSummary?.fleet?.fee,

    customer: customer || 'N/A',
    deliveryAddress:
      order?.deliveryAddress?.street +
        ', ' +
        order?.deliveryAddress?.city +
        ', ' +
        order?.deliveryAddress?.country || 'N/A',

    items:
      order?.items?.map((item: TOrderItemSnapshot) => ({
        name: item.name,
        qty: item.itemSummary?.quantity || 0,
        price: item.productPricing?.unitPrice?.toFixed(2) || '0.00',
      })) || [],

    paymentMethod: txn.paymentMethod,
    createdAt: txn.createdAt.toISOString(),
    updatedAt: txn.updatedAt.toISOString(),
  };
};

export const TransactionServices = {
  getMyTransactions,
  getTransactionById,
};
