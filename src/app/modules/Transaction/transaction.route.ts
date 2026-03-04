import { Router } from "express";
import auth from "../../middlewares/auth";
import { TransactionController } from "./transaction.controller";


const router = Router();

// get all the transactions
router.get(
    '/',
    auth('VENDOR', "CUSTOMER", "FLEET_MANAGER", "DELIVERY_PARTNER", 'SUPER_ADMIN', 'ADMIN'),
    TransactionController.getMyTransactions
);

// get transaction by transactionId
router.get(
    '/:id',
    auth('SUPER_ADMIN', 'ADMIN'),
    TransactionController.getTransactionById
);


export const transactionRoutes = router;