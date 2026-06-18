import httpStatus from 'http-status';
import mongoose from 'mongoose';
import config from '../config';
import { IngredientOrder } from '../modules/Ingredient-Order/ing-order.model';
import { Ingredient } from '../modules/Ingredients/ingredients.model';

export const releaseAbandonedIngredientStockCron = async () => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const LOCK_TIMEOUT_MINUTES = 15;
    const expiryThreshold = new Date(
      Date.now() - LOCK_TIMEOUT_MINUTES * 60 * 1000,
    );

    const abandonedOrders = await IngredientOrder.find({
      paymentStatus: 'PROCESSING',
      orderStatus: 'PENDING',
      createdAt: { $lte: expiryThreshold },
    })
      .setOptions({ skipFilter: true })
      .session(session);

    if (abandonedOrders.length === 0) {
      if (config.NODE_ENV === 'development') {
        console.log(
          'Cron (Stock Release): No abandoned ingredient orders found.',
        );
      }
      await session.commitTransaction();
      return;
    }

    if (config.NODE_ENV === 'development') {
      console.log(
        `Cron (Stock Release): Found ${abandonedOrders.length} abandoned orders. Processing...`,
      );
    }

    for (const order of abandonedOrders) {
      if (order.isDeleted) {
        await IngredientOrder.deleteOne({ _id: order._id }).session(session);
        continue;
      }

      for (const item of order.orderDetails) {
        await Ingredient.findByIdAndUpdate(
          item.ingredientId,
          { $inc: { stock: item.quantity } },
          { session },
        );
      }

      await IngredientOrder.deleteOne({ _id: order._id }).session(session);
    }

    await session.commitTransaction();

    if (config.NODE_ENV === 'development') {
      console.log(
        'Cron (Stock Release): Successfully released stock and cleaned abandoned orders.',
      );
    }
  } catch (error) {
    await session.abortTransaction();
    console.error(
      'Error in Abandoned Ingredient Order Stock Release Cron:',
      error,
    );
  } finally {
    session.endSession();
  }
};
