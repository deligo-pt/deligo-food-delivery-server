export interface SalesAnalyticsQuery {
    timeframe?: "last7days" | "last14days" | "last30days";
}
export interface SummaryFacet {
    totalRevenue: number;
    completedOrders: number;
    cancelledOrders: number;
}

export interface DailyRevenueFacet {
    _id: string;
    revenue: number;
}

export interface SalesAnalyticsResponse {
    summary: {
        totalRevenue: string;
        completedOrders: number;
        cancelledOrders: number;
        avgOrderValue: string;
    };
    revenueCards: {
        thisWeek: string;
        thisMonth: string;
        topEarningDay: string;
    };
    charts: {
        revenueTrend: { date: string; revenue: number }[];
        earningsByDay: { date: string; revenue: number }[];
    };
}
