"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ordersApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShoppingBag, Upload, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  Espresso: "bg-amber-100 text-amber-800",
  Latte: "bg-orange-100 text-orange-800",
  Cappuccino: "bg-yellow-100 text-yellow-800",
  "Cold Brew": "bg-blue-100 text-blue-800",
  "Premium Beans": "bg-purple-100 text-purple-800",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, statsRes] = await Promise.all([
        ordersApi.list(page, 50),
        ordersApi.stats(),
      ]);
      setOrders(ordersRes.data.orders);
      setTotal(ordersRes.data.total);
      setPages(ordersRes.data.pages);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg("");
    try {
      const res = await ordersApi.upload(file);
      setUploadMsg(
        `✅ Imported ${res.data.created} orders (${res.data.skipped} skipped)`
      );
      loadOrders();
    } catch {
      setUploadMsg("❌ Upload failed. Check CSV format.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" /> Orders
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total.toLocaleString()} orders tracked
          </p>
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button variant="outline" asChild>
            <span>
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Uploading..." : "Import CSV"}
            </span>
          </Button>
        </label>
      </div>

      {uploadMsg && (
        <div className="mb-4 p-3 bg-muted rounded-lg text-sm">{uploadMsg}</div>
      )}

      <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
        CSV format: <code>customerId, amount, category, orderDate</code>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
            </CardContent>
          </Card>
          {stats.categories?.map((cat: any) => (
            <Card key={cat._id}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{cat._id}</p>
                <p className="text-xl font-bold">{cat.count}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(cat.revenue)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Category</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center p-8 text-muted-foreground">Loading...</td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-8 text-muted-foreground">
                      No orders yet. Import a CSV or run the seed script.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o._id} className="border-b hover:bg-muted/30">
                      <td className="p-4">
                        <p className="font-medium">{o.customerId?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{o.customerId?.email}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[o.category] || ""}`}>
                          {o.category}
                        </span>
                      </td>
                      <td className="p-4 font-semibold">{formatCurrency(o.amount)}</td>
                      <td className="p-4 text-muted-foreground">{formatDate(o.orderDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
