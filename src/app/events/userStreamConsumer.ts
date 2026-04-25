/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { RedisService } from '../config/redis';
import { ROLE_COLLECTION_MAP } from '../constant/user.constant';
import AppError from '../errors/AppError';
import httpStatus from 'http-status';

const STREAM_KEY = 'user:events';
const GROUP_NAME = 'food-service-group';
const CONSUMER_NAME = `food-consumer-${process.pid}`;

export const initUserStreamConsumer = async () => {
    await RedisService.createConsumerGroup(STREAM_KEY, GROUP_NAME, '$');

    console.log(`User Stream Consumer started: ${CONSUMER_NAME}`);

    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            const streams = await RedisService.getClient().xreadgroup(
                'GROUP', GROUP_NAME, CONSUMER_NAME,
                'COUNT', 10,
                'BLOCK', 3000,
                'STREAMS', STREAM_KEY, '>'
            ) as any[] | null;

            if (!streams || streams.length === 0) continue;

            for (const [_, messages] of streams) {
                for (const [messageId, fields] of messages) {
                    try {
                        const payload = JSON.parse(fields[1]);

                        await handleUserEvent(payload);

                        await RedisService.getClient().xack(STREAM_KEY, GROUP_NAME, messageId);
                    } catch (err) {
                        console.error(`Failed to process message ${messageId}:`, err);
                    }
                }
            }
        } catch (err) {
            console.error('Redis Stream consumer error:', err);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
};

// Main Event Handler
const handleUserEvent = async (payload: any) => {
    const { type, id, role } = payload;

    if (!role) {
        throw new AppError(httpStatus.BAD_REQUEST, `Event missing role: ${type}`);
    }

    const modelName = ROLE_COLLECTION_MAP[role as keyof typeof ROLE_COLLECTION_MAP];
    if (!modelName) {
        throw new AppError(httpStatus.NOT_FOUND, `No model found for role: ${role}`);
    }

    const Model = mongoose.model(modelName);

    console.log(`Processing ${type} for ${role} (${id})`);

    switch (type) {
        case 'USER_REGISTERED':
            await handleUserRegistered(Model, payload);
            break;

        case 'USER_STATUS_CHANGED':
            await handleUserStatusChanged(Model, payload);
            break;

        case 'USER_SOFT_DELETED':
            await handleSoftDelete(Model, id);
            break;

        case 'USER_PERMANENTLY_DELETED':
            await handlePermanentDelete(Model, id);
            break;

        default:
            throw new AppError(httpStatus.NOT_FOUND, `Unknown event type: ${type}`);
    }
};

// Specific Handlers

// 1. For new user registration → Create or Upsert
// Alternative - More explicit create approach
const handleUserRegistered = async (Model: mongoose.Model<any>, payload: any) => {
    const { id, userId, email, role, registeredBy, status, ...rest } = payload;

    try {
        // First try to find if already exists
        const existing = await Model.findOne({ authUserId: id });

        if (existing) {
            // Update if exists
            await Model.updateOne(
                { authUserId: id },
                { $set: { ...rest, updatedAt: new Date() } }
            );

        } else {
            // Create new document
            await Model.create({
                authUserId: id,
                customUserId: userId,
                email,
                role,
                status,
                registeredBy,
                ...rest,
                createdAt: new Date(),
            });
            console.log(`New user created in ${Model.modelName}: ${email}`);
        }
    } catch (error) {
        console.error(`Failed to handle USER_REGISTERED for ${email}:`, error);
        throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to process user registration');
    }
};

// 2. For status change (APPROVED, SUBMITTED, REJECTED, etc.)
const handleUserStatusChanged = async (Model: mongoose.Model<any>, payload: any) => {
    const { id, status, ...rest } = payload;

    await Model.updateOne(
        { authUserId: id },
        {
            $set: {
                status: status,
                ...rest,
            },
        }
    );

    console.log(`User Status Updated: ${id} → ${status}`);
};

// 3. Soft Delete
const handleSoftDelete = async (Model: mongoose.Model<any>, authUserId: string) => {
    await Model.updateOne(
        { authUserId },
        { $set: { isDeleted: true } }
    );
    console.log(`User Soft Deleted: ${authUserId}`);
};

// 4. Permanent Delete
const handlePermanentDelete = async (Model: mongoose.Model<any>, authUserId: string) => {
    await Model.deleteOne({ authUserId });
    console.log(`User Permanently Deleted: ${authUserId}`);
};