import mongoose from 'mongoose';
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
      await session.commitTransaction();
      return;
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
