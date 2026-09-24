'use client';

import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, ShoppingBag, Receipt, Users, UtensilsCrossed,
  Package, CalendarCheck, Clock, ArrowUpRight, ArrowDownRight,
  ChefHat, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '@/lib/api';
import { formatCurrency } from '@ros/utils';

interface DashboardSummary {
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  ordersChange: number;
  avgOrderValue: number;
  tableOccupancy: number;
  activeOrders: number;
  reservationsToday: number;
  lowStockCount: number;
  topItems: Array<{ name: string; count: number; revenue: number }>;
  recentOrders: Array<{ id: string; orderNumber: string; status: string; total: number; table?: string; createdAt: string }>;
  kitchenQueue: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  change,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  change?: number;
  accent?: boolean;
}) {
  const positive = change !== undefined && change >= 0;
  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${accent ? 'bg-primary/15' : 'bg-muted'} transition-colors group-hover:bg-primary/20`}>
          <Icon className={`w-5 h-5 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${positive ? 'text-green-500' : 'text-red-500'}`}>
            {positive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-foreground tabular">{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/60 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

const statusColors: Record<string, string> = {
  DRAFT:           'muted',
  CONFIRMED:       'info',
  SENT_TO_KITCHEN: 'info',
  PREPARING:       'warning',
  READY:           'success',
  SERVED:          'success',
  BILLED:          'warning',
  PAID:            'success',
  COMPLETED:       'secondary',
  CANCELLED:       'destructive',
  VOIDED:          'destructive',
};

export default function DashboardPage() {
  // In production, this hits GET /api/v1/reports/dashboard?period=today
  // For now, use placeholder data that shows the design
  const data: DashboardSummary = {
    totalRevenue: 48250,
    revenueChange: 12.4,
    totalOrders: 87,
    ordersChange: 8.1,
    avgOrderValue: 554,
    tableOccupancy: 68,
    activeOrders: 12,
    reservationsToday: 6,
    lowStockCount: 3,
    kitchenQueue: 5,
    topItems: [
      { name: 'Butter Chicken', count: 34, revenue: 11766 },
      { name: 'Chicken Biryani', count: 28, revenue: 9772 },
      { name: 'Dal Makhani', count: 22, revenue: 5478 },
      { name: 'Paneer Tikka', count: 19, revenue: 4769 },
      { name: 'Mango Lassi', count: 41, revenue: 5289 },
    ],
    recentOrders: [
      { id: '1', orderNumber: 'ORD-20240923-0087', status: 'PREPARING', total: 1248, table: 'T5', createdAt: new Date(Date.now() - 12 * 60000).toISOString() },
      { id: '2', orderNumber: 'ORD-20240923-0086', status: 'BILLED', total: 875, table: 'T3', createdAt: new Date(Date.now() - 28 * 60000).toISOString() },
      { id: '3', orderNumber: 'ORD-20240923-0085', status: 'PAID', total: 2100, table: 'T7', createdAt: new Date(Date.now() - 45 * 60000).toISOString() },
      { id: '4', orderNumber: 'ORD-20240923-0084', status: 'COMPLETED', total: 645, createdAt: new Date(Date.now() - 62 * 60000).toISOString() },
      { id: '5', orderNumber: 'ORD-20240923-0083', status: 'PREPARING', total: 3420, table: 'T10', createdAt: new Date(Date.now() - 8 * 60000).toISOString() },
    ],
  };

  const stats = [
    { icon: TrendingUp, label: "Today's Revenue", value: formatCurrency(data.totalRevenue), change: data.revenueChange, accent: true },
    { icon: ShoppingBag, label: "Today's Orders", value: String(data.totalOrders), change: data.ordersChange, sub: `Avg ₹${data.avgOrderValue}` },
    { icon: UtensilsCrossed, label: 'Active Orders', value: String(data.activeOrders), sub: 'Currently being served' },
    { icon: ChefHat, label: 'Kitchen Queue', value: String(data.kitchenQueue), sub: 'KOTs awaiting action' },
    { icon: Receipt, label: 'Table Occupancy', value: `${data.tableOccupancy}%`, sub: 'Of available tables' },
    { icon: CalendarCheck, label: "Today's Reservations", value: String(data.reservationsToday), sub: 'Booked covers' },
  ];

  const timeAgo = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {data.lowStockCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">{data.lowStockCount} low stock alerts</span>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent orders */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Orders</CardTitle>
              <a href="/orders" className="text-xs text-primary hover:underline">View all →</a>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {data.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.table ? `Table ${order.table}` : 'Takeaway'} · {timeAgo(order.createdAt)}
                    </p>
                  </div>
                  <Badge variant={(statusColors[order.status] as any) || 'muted'} className="text-[10px] shrink-0">
                    {order.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-sm font-bold tabular text-foreground shrink-0">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topItems.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.count} orders</p>
                </div>
                <span className="text-xs font-bold text-foreground tabular shrink-0">
                  {formatCurrency(item.revenue)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
