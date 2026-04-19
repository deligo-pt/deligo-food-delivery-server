/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { ROLE_COLLECTION_MAP } from '../constant/user.constant';
import { RedisService } from '../config/redisConfig';

const STREAM_KEY = 'user:events';
const GROUP_NAME = 'food-service-group';           // ← Change this per service (e.g., delivery-service-group)
const CONSUMER_NAME = `food-consumer-${process.pid}`;

export const initUserStreamConsumer = async () => {
    // 1. Create consumer group (safe to call multiple times)
    await RedisService.createConsumerGroup(STREAM_KEY, GROUP_NAME, '$');

    console.log(`Redis Stream Consumer started → ${CONSUMER_NAME} (Group: ${GROUP_NAME})`);

    // 2. Start consuming messages
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            const streams = await RedisService.getClient().xreadgroup(
                'GROUP', GROUP_NAME, CONSUMER_NAME,
                'COUNT', 10,
                'BLOCK', 3000,
                'STREAMS', STREAM_KEY, '>'
            ) as any[] | null;

            if (!streams || streams.length === 0) {
                continue;
            }

            for (const [_, messages] of streams) {
                for (const [messageId, fields] of messages) {
                    try {
                        const payload = JSON.parse(fields[1]);   // 'data' field

                        await handleUserEvent(payload);

                        // Acknowledge
                        await RedisService.getClient().xack(STREAM_KEY, GROUP_NAME, messageId);

                    } catch (err) {
                        console.error(`Failed to process message ${messageId}:`, err);
                        // Do not ack on error (for retry)
                    }
                }
            }
        } catch (err) {
            console.error('Redis Stream consumer error:', err);
            await new Promise((resolve) => setTimeout(resolve, 1000)); // backoff
        }
    }
};

// Handle All User Events in One Place
const handleUserEvent = async (payload: any) => {
    const { type, id } = payload;

    console.log(`Processing event: ${type} for user ${id}`);

    switch (type) {
        case 'USER_REGISTERED':
        case 'USER_STATUS_CHANGED':
            await syncUserProfile(payload);
            break;

        case 'USER_SOFT_DELETED':
            await handleSoftDelete(payload);
            break;

        case 'USER_PERMANENTLY_DELETED':
            await handlePermanentDelete(payload);
            break;

        default:
            console.warn(`Unknown event type: ${type}`);
    }
};

// Common sync function (used by REGISTERED and STATUS_CHANGED)
const syncUserProfile = async (payload: any) => {
    const modelName = ROLE_COLLECTION_MAP[payload.role as keyof typeof ROLE_COLLECTION_MAP];
    if (!modelName) {
        console.warn(`No model found for role: ${payload.role}`);
        return;
    }

    const Model = mongoose.model(modelName);

    await Model.updateOne(
        { authUserId: payload.id },
        {
            $set: {
                authUserId: payload.id,
                customUserId: payload.userId,
                email: payload.email,
                role: payload.role,
                status: payload.status,        // useful for status change
                ...payload,                    // in case you send more fields
            },
        },
        { upsert: true }
    );
};

const handleSoftDelete = async (payload: any) => {
    const modelName = ROLE_COLLECTION_MAP[payload.role as keyof typeof ROLE_COLLECTION_MAP];
    if (!modelName) return;

    const Model = mongoose.model(modelName);
    await Model.updateOne(
        { authUserId: payload.id },
        { $set: { isDeleted: true } }
    );
};

const handlePermanentDelete = async (payload: any) => {
    const modelName = ROLE_COLLECTION_MAP[payload.role as keyof typeof ROLE_COLLECTION_MAP];
    if (!modelName) return;

    const Model = mongoose.model(modelName);
    await Model.deleteOne({ authUserId: payload.id });
};