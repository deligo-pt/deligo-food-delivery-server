/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Calculates the date range and grouping resolution.
 * If timeframe is null/undefined, it defaults to "all time" logic.
 */
export const getReportTimeframe = (timeframe?: string, fromDate?: string | Date, toDate?: string | Date) => {
    const now = new Date();
    let start: Date | null = null;
    const end: Date = toDate ? new Date(toDate) : now;

    // Handle Timeframe
    if (timeframe === 'custom' && fromDate) {
        start = new Date(fromDate);
    } else if (timeframe) {
        let days = 7;
        if (timeframe === 'last14days') days = 14;
        else if (timeframe === 'last30days') days = 30;
        else if (timeframe === 'last90days') days = 90;
        else if (timeframe === 'last1Year') days = 365;

        start = new Date();
        start.setDate(start.getDate() - days);
        start.setHours(0, 0, 0, 0);
    }

    // Determine Resolution
    let resolution: 'day' | 'multiDay' | 'month' | 'multiMonth' | 'year' = 'year';
    let size = 0;

    if (start) {
        const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 14) resolution = 'day';
        else if (diffDays <= 30) { resolution = 'multiDay'; size = 3; }
        else if (diffDays <= 90) { resolution = 'multiDay'; size = 9; }
        else if (diffDays <= 365) resolution = 'month';
        else if (diffDays <= 730) { resolution = 'multiMonth'; size = 2; }
    }

    return { start, end, resolution, size };
};

/**
 * Generates the Mongo $group _id object based on resolution.
 */
export const getGroupingPipeline = (resolution: string, size: number): any => {
    const groupId: any = { year: { $year: '$createdAt' } };
    if (resolution === 'day') {
        groupId.month = { $month: '$createdAt' };
        groupId.day = { $dayOfMonth: '$createdAt' };
    } else if (resolution === 'multiDay') {
        groupId.bucket = { $floor: { $divide: [{ $subtract: [{ $dayOfYear: '$createdAt' }, 1] }, size] } };
    } else if (resolution === 'month') {
        groupId.month = { $month: '$createdAt' };
    } else if (resolution === 'multiMonth') {
        groupId.bucket = { $floor: { $divide: [{ $subtract: [{ $month: '$createdAt' }, 1] }, size] } };
    }
    return groupId;
};