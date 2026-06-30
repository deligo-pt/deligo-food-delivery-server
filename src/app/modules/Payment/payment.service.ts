/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import config from '../../config';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { CheckoutSummary } from '../Checkout/checkout.model';
import {
  TIngredientOrder,
  TIngredientOrderDetail,
} from '../Ingredient-Order/ing-order.interface';
import mongoose from 'mongoose';
import { Vendor } from '../Vendor/vendor.model';
import { Ingredient } from '../Ingredients/ingredients.model';
import { IngredientOrder } from '../Ingredient-Order/ing-order.model';
import { GlobalSettingsService } from '../GlobalSetting/globalSetting.service';
import { TPaymentMethod } from '../../constant/GlobalInterface/payment.interface';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';

const solutionIds = {
  CARD: '117',
  MB_WAY: '110',
  APPLE_PAY: '115',
  PAYPAL: '105',
  GOOGLE_PAY: '114',
  OTHER: null,
};

// create redUniq payment intent service
const createRedUniqPayment = async (
  checkoutSummaryId: string,
  paymentMethod: TPaymentMethod,
) => {
  const summary = await CheckoutSummary.findById(checkoutSummaryId);
  if (!summary) throw new AppError(httpStatus.NOT_FOUND, 'SUMMARY_NOT_FOUND');

  if (summary.isConvertedToOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'CHECKOUT_SUMMARY_ALREADY_CONVERTED',
    );
  }

  if (summary.paymentStatus === 'PROCESSING') {
    throw new AppError(httpStatus.BAD_REQUEST, 'PAYMENT_ALREADY_IN_PROCESS');
  }

  if (summary.paymentStatus === 'PAID') {
    throw new AppError(httpStatus.BAD_REQUEST, 'PAYMENT_ALREADY_COMPLETED');
  }

  if (!config.redUniq.api_url) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'REDUNIQ_API_URL_NOT_CONFIGURED',
    );
  }

  const payload = {
    method: 'initPayment',
    api: {
      username: config.redUniq.username,
      password: config.redUniq.password,
    },
    payment: {
      amount: Math.round(summary.payoutSummary.grandTotal * 100),
      action: 101, // 101 means immediate sale
      currency: '978', // EUR
      solution: paymentMethod !== 'OTHER' ? solutionIds[paymentMethod] : null,
      description: `Order Payment via ${paymentMethod}`,
    },

    order: {
      ref: checkoutSummaryId,
      amount: Math.round(summary.payoutSummary.grandTotal * 100),
      date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    },
    returnUrlOk: `${config.frontend_urls.payment}/payment-success?summaryId=${checkoutSummaryId}`,
    returnUrlError: `${config.frontend_urls.payment}/payment-failed?summaryId=${checkoutSummaryId}`,
    languageCode: 'pt',
  };

  try {
    const response = await axios.post(config.redUniq.api_url, payload);

    const { result = {}, token, redirectUrl } = response.data || {};

    if (
      !result?.code ||
      (result.code !== '00000000' && result.code !== '17000000000')
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'PAYMENT_INITIATION_FAILED_BY_GATEWAY',
      );
    }

    if (token) {
      summary.paymentMethod = paymentMethod;
      summary.paymentStatus = 'PROCESSING';
      await summary.save();
    }

    return {
      messageKey: 'REDUNIQ_PAYMENT_SESSION_CREATED' as TMessageKey,
      data: {
        redirectUrl,
        paymentToken: token,
      },
    };
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 502) {
        throw new AppError(
          error.response.status,
          'PAYMENT_GATEWAY_TEMP_UNAVAILABLE_502',
        );
      }

      throw new AppError(error.response.status, 'GATEWAY_ERROR');
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'PAYMENT_PROCESSING_FAILED',
    );
  }
};

// handle payment failure
const handlePaymentFailure = async (
  checkoutSummaryId: string,
  currentUser: TCurrentUser,
) => {
  const summary = await CheckoutSummary.findById(checkoutSummaryId);

  if (!summary) throw new AppError(httpStatus.NOT_FOUND, 'SUMMARY_NOT_FOUND');

  if (summary.customerId.toString() !== currentUser._id.toString()) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'NOT_AUTHORIZED_TO_VIEW');
  }

  if (!summary.isConvertedToOrder) {
    summary.paymentStatus = 'FAILED';
    await summary.save();
  }

  return {
    messageKey: 'PAYMENT_STATUS_RESET_SUCCESS' as TMessageKey,
    data: null,
  };
};

// create ingredients payment service
const createIngredientRedUniqPayment = async (
  payload: TIngredientOrder,
  currentUser: TCurrentUser,
) => {
  const { orderDetails, paymentMethod, deliveryAddress } = payload;

  if (!orderDetails || orderDetails.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'ORDER_DETAILS_EMPTY');
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const vendorInfo = await Vendor.findById(currentUser._id).session(session);
    if (!vendorInfo) {
      throw new AppError(httpStatus.NOT_FOUND, 'VENDOR_NOT_FOUND');
    }

    const pendingOrders = await IngredientOrder.find({
      vendorId: currentUser._id,
      paymentStatus: 'PROCESSING',
      orderStatus: 'PENDING',
    })
      .setOptions({ skipFilter: true })
      .session(session);

    for (const oldOrder of pendingOrders) {
      if (oldOrder.isDeleted) {
        await IngredientOrder.deleteOne({ _id: oldOrder._id }).session(session);
        continue;
      }

      for (const item of oldOrder.orderDetails) {
        await Ingredient.findByIdAndUpdate(
          item.ingredientId,
          { $inc: { stock: item.quantity } },
          { session },
        );
      }

      await IngredientOrder.deleteOne({ _id: oldOrder._id }).session(session);
    }

    const processedOrderDetails: TIngredientOrderDetail[] = [];
    let totalOriginalPrice = 0;
    let totalProductDiscount = 0;
    let totalTaxAmount = 0;

    for (const item of orderDetails) {
      const ingredient = await Ingredient.findOne({
        _id: item.ingredientId,
        isDeleted: false,
      })
        .populate('tax')
        .session(session);

      if (!ingredient) {
        throw new AppError(httpStatus.NOT_FOUND, 'INGREDIENT_NOT_FOUND', {
          ingredientId: String(item.ingredientId),
        });
      }

      if (item.quantity > ingredient.stock) {
        throw new AppError(httpStatus.BAD_REQUEST, 'STOCK_NOT_AVAILABLE', {
          name: ingredient.name,
          stock: ingredient.stock,
        });
      }

      if (item.quantity < (ingredient.minOrder || 1)) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'MINIMUM_ORDER_QUANTITY_REQUIRED',
          { name: ingredient.name, minOrder: ingredient.minOrder || 1 },
        );
      }

      let activePrice = ingredient.price;
      if (ingredient.bulkDiscount && ingredient.bulkDiscount.length > 0) {
        const applicableDiscount = ingredient.bulkDiscount
          .filter((d) => item.quantity >= d.minQty)
          .sort((a, b) => b.minQty - a.minQty)[0];

        if (applicableDiscount) {
          activePrice = applicableDiscount.discountPrice;
        }
      }

      const itemOriginalCost = item.quantity * ingredient.price;
      const itemActualCostBeforeTax = item.quantity * activePrice;
      const itemDiscount = itemOriginalCost - itemActualCostBeforeTax;

      const taxRate = (ingredient.tax as any)?.taxRate || 0;
      const itemTaxAmount = Number(
        ((itemActualCostBeforeTax * taxRate) / 100).toFixed(2),
      );
      const itemTotalAmount = Number(
        (itemActualCostBeforeTax + itemTaxAmount).toFixed(2),
      );

      ingredient.stock =
        (Number(ingredient.stock) || 0) - Number(item.quantity);
      await ingredient.save({ session });

      processedOrderDetails.push({
        ingredientId: ingredient._id,
        name: ingredient.name,
        sku: ingredient.sku,
        unit: ingredient.unit,
        quantity: item.quantity,
        pricePerUnit: activePrice,
        taxRate: taxRate,
        taxAmount: itemTaxAmount,
        totalAmount: itemTotalAmount,
      });

      totalOriginalPrice += itemOriginalCost;
      totalProductDiscount += itemDiscount;
      totalTaxAmount += itemTaxAmount;
    }

    const globalSettings = await GlobalSettingsService.getGlobalSettings();
    const ingredientOrderSettings = globalSettings?.ingredientOrder;
    const vendorCity =
      vendorInfo.businessLocation?.city?.trim().toLowerCase() || '';

    let deliveryChargeBase = 0;
    if (vendorCity === 'lisbon' || vendorCity === 'lisboa') {
      deliveryChargeBase =
        ingredientOrderSettings?.deliveryChargeInsideLisbon || 20;
    } else {
      deliveryChargeBase =
        ingredientOrderSettings?.deliveryChargeOutsideLisbon || 30;
    }

    deliveryChargeBase = Number(deliveryChargeBase.toFixed(2));
    const deliveryVatRate = globalSettings?.deliveryVatRate || 0;
    const deliveryVatAmount = Number(
      ((deliveryChargeBase * deliveryVatRate) / 100).toFixed(2),
    );
    const deliveryChargeTotal = Number(
      (deliveryChargeBase + deliveryVatAmount).toFixed(2),
    );

    const taxableAmount = Number(
      (totalOriginalPrice - totalProductDiscount).toFixed(2),
    );
    totalTaxAmount = Number(totalTaxAmount.toFixed(2));

    const grandTotal = Number(
      (taxableAmount + totalTaxAmount + deliveryChargeTotal).toFixed(2),
    );

    const [newOrder] = await IngredientOrder.create(
      [
        {
          vendorId: currentUser._id,
          orderDetails: processedOrderDetails,
          deliveryAddress: deliveryAddress || vendorInfo.businessLocation,
          delivery: {
            charge: deliveryChargeBase,
            vatRate: deliveryVatRate,
            vatAmount: deliveryVatAmount,
            totalDeliveryCharge: deliveryChargeTotal,
          },
          orderCalculation: {
            totalOriginalPrice: Number(totalOriginalPrice.toFixed(2)),
            totalProductDiscount: Number(totalProductDiscount.toFixed(2)),
            taxableAmount,
            totalTaxAmount,
          },
          grandTotal,
          paymentMethod,
          orderStatus: 'PENDING',
          paymentStatus: 'PROCESSING',
          isDeleted: false,
        },
      ],
      { session },
    );

    const orderPayload = {
      method: 'initPayment',
      api: {
        username: config.redUniq.username,
        password: config.redUniq.password,
      },
      payment: {
        amount: Math.round(grandTotal * 100),
        action: 101,
        currency: '978',
        solution: paymentMethod !== 'OTHER' ? solutionIds[paymentMethod] : null,
        description: `Ingredient Order Reference: ${newOrder._id}`,
      },
      order: {
        ref: newOrder._id.toString(),
        amount: Math.round(grandTotal * 100),
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      },
      returnUrlOk: `${config.frontend_urls.vendor}/vendor/ingredients/orders/payment-success?orderId=${newOrder._id}`,
      returnUrlError: `${config.frontend_urls.vendor}/vendor/ingredients/orders/payment-failed?orderId=${newOrder._id}`,
    };

    const response = await axios.post(
      config.redUniq.api_url as string,
      orderPayload,
    );
    const { result, token, redirectUrl } = response.data;

    if (
      !result?.code ||
      (result.code !== '00000000' && result.code !== '17000000000')
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'REDUNIQ_PAYMENT_INITIATION_FAILED',
      );
    }

    if (!token) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'PAYMENT_TOKEN_NOT_RECEIVED',
      );
    }

    if (token) {
      newOrder.transactionId = token;
      await newOrder.save({ session });

      await session.commitTransaction();

      return {
        messageKey: 'INGREDIENT_REDUNIQ_PAYMENT_SESSION_CREATED' as TMessageKey,
        data: {
          redirectUrl: redirectUrl,
          paymentToken: token,
        },
      };
    } else {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'REDUNIQ_PAYMENT_INITIATION_FAILED',
      );
    }
  } catch (error: unknown) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(httpStatus.BAD_REQUEST, 'TRANSACTION_FAILED');
  } finally {
    session.endSession();
  }
};

export const PaymentServices = {
  createRedUniqPayment,
  handlePaymentFailure,
  createIngredientRedUniqPayment,
};
