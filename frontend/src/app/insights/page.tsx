"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { analyticsApi } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BarChart2,
  Lightbulb,
  DollarSign,
  TrendingUp,
  Brain,
  Loader2,
  RefreshCw,
  BookOpen,
} from "lucide-react";

const CHART_COLORS = ["#b45309", "#d97706", "#f59e0b", "#fbbf24", "#fcd34d"];

export default function InsightsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string>("");
  const [learnings, setLearnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [insightLoading, setInsightLoading] = useState(false);
  const [recLoading, setRecLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [analyticsRes, revenueRes] = await Promise.all([
        analyticsApi.overview(),
        analyticsApi.revenue(),
      ]);
      setAnalytics(analyticsRes.data);
      setRevenue(revenueRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadInsights() {
    setInsightLoading(true);
    try {
      const res = await analyticsApi.insights();
      setInsights(res.data.insights);
    } catch (err) {
      console.error(err);
    } finally {
      setInsightLoading(false);
    }
  }

  async function loadRecommendations() {
    setRecLoading(true);
    try {
      const res = await analyticsApi.recommendations("maximize revenue and reduce churn");
      setRecommendations(res.data.recommendation);
      setLearnings(res.data.learnings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setRecLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading analytics...
      </div>
    );
  }

  const campaignPerformance = analytics?.campaignPerformance?.slice(0, 8) || [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-primary" />
            Analytics & Insights
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Campaign performance and AI-powered insights
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Campaigns",
            value: analytics?.totalCampaigns || 0,
            icon: BarChart2,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Avg Open Rate",
            value: `${analytics?.avgOpenRate || 0}%`,
            icon: TrendingUp,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "Avg Click Rate",
            value: `${analytics?.avgClickRate || 0}%`,
            icon: TrendingUp,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
          {
            label: "Total Revenue",
            value: formatCurrency(revenue?.totalRevenue || 0),
            icon: DollarSign,
            color: "text-orange-600",
            bg: "bg-orange-50",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="p-5">
                <div className={`w-8 h-8 ${item.bg} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <p className="text-xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Campaign Performance Chart */}
        {campaignPerformance.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaign Open Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={campaignPerformance} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => [`${val}%`, "Open Rate"]} />
                  <Bar dataKey="openRate" fill="#b45309" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Revenue by Campaign */}
        {revenue?.revenueByCampaign?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue by Campaign</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={revenue.revenueByCampaign.slice(0, 6)}
                  margin={{ top: 5, right: 10, bottom: 20, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="campaignName"
                    tick={{ fontSize: 10 }}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => [formatCurrency(val as number), "Revenue"]} />
                  <Bar dataKey="totalRevenue" fill="#059669" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Revenue Campaigns */}
      {revenue?.topCampaigns?.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Top Revenue Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Campaign</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Revenue</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {revenue.topCampaigns.map((c: any, i: number) => (
                  <tr key={c.campaignId} className="border-b">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          i === 0 ? "bg-yellow-500" : i === 1 ? "bg-gray-400" : "bg-orange-400"
                        }`}>
                          {i + 1}
                        </div>
                        {c.campaignName}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-green-600">
                      {formatCurrency(c.totalRevenue)}
                    </td>
                    <td className="p-4">{c.orderCount} orders</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-base">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              AI Insights
            </span>
            <Button size="sm" variant="outline" onClick={loadInsights} disabled={insightLoading}>
              {insightLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Lightbulb className="w-4 h-4 mr-1" />
              )}
              Generate Insights
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Click "Generate Insights" to get AI-powered analysis of your campaign data.
            </p>
          ) : (
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100"
                >
                  <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">{i + 1}</span>
                  </div>
                  <p className="text-sm text-amber-900">{insight}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Marketing Memory & Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-base">
              <Brain className="w-5 h-5 text-purple-500" />
              Marketing Memory & Recommendations
            </span>
            <Button size="sm" variant="outline" onClick={loadRecommendations} disabled={recLoading}>
              {recLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Brain className="w-4 h-4 mr-1" />
              )}
              Get Recommendations
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recommendations ? (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                <p className="text-sm font-medium text-purple-800 mb-1">
                  AI Recommendation (based on past campaign learnings):
                </p>
                <p className="text-sm text-purple-900">{recommendations}</p>
              </div>

              {learnings.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Historical Campaign Learnings ({learnings.length})
                  </p>
                  <div className="space-y-2">
                    {learnings.map((l) => (
                      <div
                        key={l._id}
                        className="p-3 border rounded-lg flex items-center justify-between text-sm"
                      >
                        <div>
                          <p className="font-medium">{l.campaignName}</p>
                          <p className="text-xs text-muted-foreground">
                            {l.segmentDescription}
                          </p>
                        </div>
                        <div className="flex gap-4 text-xs text-right">
                          <div>
                            <p className="font-medium">{l.openRate}%</p>
                            <p className="text-muted-foreground">Open</p>
                          </div>
                          <div>
                            <p className="font-medium">{l.clickRate}%</p>
                            <p className="text-muted-foreground">Click</p>
                          </div>
                          <div>
                            <p className="font-medium text-green-600">
                              {formatCurrency(l.revenue)}
                            </p>
                            <p className="text-muted-foreground">Revenue</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click "Get Recommendations" to see AI-powered suggestions based on past campaign learnings (Marketing Memory).
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
