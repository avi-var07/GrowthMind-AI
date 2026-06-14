"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { churnApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Info,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";

export default function ChurnPage() {
  const [summary, setSummary] = useState({ total: 0, high: 0, medium: 0 });
  const [customers, setCustomers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState<"all" | "high" | "medium">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    churnApi.summary().then((res) => setSummary(res.data));
  }, []);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const risk = filter === "all" ? undefined : filter;
      const res = await churnApi.customers(page, risk);
      setCustomers(res.data.customers);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  function ChurnBadge({ risk }: { risk: string }) {
    if (risk === "high")
      return (
        <Badge variant="danger" className="text-xs">
          🔴 High Risk
        </Badge>
      );
    if (risk === "medium")
      return (
        <Badge variant="warning" className="text-xs">
          🟡 Medium Risk
        </Badge>
      );
    return (
      <Badge variant="success" className="text-xs">
        🟢 Low Risk
      </Badge>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-orange-500" />
          Churn Detection
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Customers at risk of leaving your coffee brand
        </p>
      </div>

      {/* How churn is calculated - transparency */}
      <Card className="mb-6 border-orange-100 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-800">
                How Churn Risk is Calculated
              </p>
              <p className="text-xs text-orange-700 mt-1">
                🔴 <strong>High Risk</strong>: Last order was more than 45 days ago
                &nbsp;|&nbsp; 🟡 <strong>Medium Risk</strong>: Last order was more
                than 30 days ago &nbsp;|&nbsp; 🟢 <strong>Low Risk</strong>: Active
                within 30 days
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="border-red-100">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold text-red-600">{summary.high}</p>
            <p className="text-sm text-red-700 font-medium mt-1">High Risk</p>
            <p className="text-xs text-muted-foreground">45+ days inactive</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-100">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold text-yellow-600">{summary.medium}</p>
            <p className="text-sm text-yellow-700 font-medium mt-1">Medium Risk</p>
            <p className="text-xs text-muted-foreground">30-45 days inactive</p>
          </CardContent>
        </Card>
        <Card className="border-gray-100">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold text-gray-700">{summary.total}</p>
            <p className="text-sm text-gray-700 font-medium mt-1">Total At Risk</p>
            <p className="text-xs text-muted-foreground">Need re-engagement</p>
          </CardContent>
        </Card>
      </div>

      {/* Action CTA */}
      <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            Ready to win back {summary.total} at-risk customers?
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Use AI segmentation to create a targeted re-engagement campaign
          </p>
        </div>
        <Link href="/chat">
          <Button size="sm">
            <TrendingDown className="w-4 h-4 mr-2" />
            Create Re-engagement Campaign
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {(["all", "high", "medium"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
          >
            {f === "all" ? "All At-Risk" : f === "high" ? "High Risk" : "Medium Risk"}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Risk</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Why?</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Favorite</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Total Spend</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Last Order</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-muted-foreground">Loading...</td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-muted-foreground">
                      No at-risk customers. Run seed script to populate data.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.customerId} className="border-b hover:bg-muted/30">
                      <td className="p-4">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                        <p className="text-xs text-muted-foreground">{c.city}</p>
                      </td>
                      <td className="p-4">
                        <ChurnBadge risk={c.churnRisk} />
                      </td>
                      <td className="p-4">
                        {/* Transparent churn reason */}
                        <p className="text-xs text-muted-foreground max-w-[200px]">
                          {c.churnReason}
                        </p>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" className="text-xs">
                          {c.favoriteCategory}
                        </Badge>
                      </td>
                      <td className="p-4 font-medium">{formatCurrency(c.totalSpend)}</td>
                      <td className="p-4 text-muted-foreground">
                        {formatDate(c.lastOrderDate)}
                        <p className="text-xs text-red-500">{c.daysSinceLastOrder} days ago</p>
                      </td>
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
            Page {page} of {pages} ({total} at-risk customers)
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
