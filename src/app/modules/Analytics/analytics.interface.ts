export interface TimeframeQuery {
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
        totalRevenue: number;
        completedOrders: number;
        cancelledOrders: number;
        avgOrderValue: number;
    };
    revenueCards: {
        thisWeek: number;
        thisMonth: number;
        topEarningDay: string;
    };
    charts: {
        revenueTrend: { date: string; revenue: number }[];
        earningsByDay: { date: string; revenue: number }[];
    };
}


export interface OrderReportAnalyticsResponse {
    summary: {
        totalRevenue: number;
        totalOrders: number;
        avgOrderValue: number;
    };

    ordersByZone: {
        zone: string;
        orders: number;
    }[];

    revenueTrend: {
        date: string;
        revenue: number;
    }[];

    zoneHeatmap: {
        zone: string;
        hour: number;
        orderCount: number;
    }[];
};

export type TVendorSalesReport = {
    stats: {
        totalSales: number;
        totalOrders: number;
        avgOrderValue: number;
    };
    salesData: {
        name: string;
        sales: number;
        orders: number;
    }[];
};