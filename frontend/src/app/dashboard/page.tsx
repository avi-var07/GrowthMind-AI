"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { customersApi, ordersApi, churnApi, analyticsApi, demoApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  ShoppingBag,
  AlertTriangle,
  TrendingUp,
  Coffee,
  Activity,
  Target,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    customers: 0,
    orders: 0,
    totalRevenue: 0,
    churnRisk: { total: 0, high: 0, medium: 0 },
    analytics: null as any,
  });
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoResult, setDemoResult] = useState<any>(null);

  async function loadStats() {
    setLoading(true);
    try {
      const [customersRes, ordersRes, churnRes, analyticsRes] =
        await Promise.all([
          customersApi.stats(),
          ordersApi.stats(),
          churnApi.summary(),
          analyticsApi.overview(),
        ]);

      setStats({
        customers: customersRes.data.total,
        orders: ordersRes.data.total,
        totalRevenue: ordersRes.data.totalRevenue,
        churnRisk: churnRes.data,
        analytics: analyticsRes.data,
      });
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function handleLoadDemo(force: boolean = false) {
    if (!force && (stats.customers > 0 || stats.orders > 0)) {
      setShowDemoModal(true);
      return;
    }
    
    setShowDemoModal(false);
    setDemoLoading(true);
    setDemoResult(null);
    try {
      const res = await demoApi.load(force);
      setDemoResult(res.data);
      await loadStats();
    } catch (error) {
      console.error(error);
      alert("Failed to load demo data.");
    } finally {
      setDemoLoading(false);
    }
  }

  const statCards = [
    {
      title: "Total Customers",
      value: stats.customers.toLocaleString(),
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/customers",
    },
    {
      title: "Total Orders",
      value: stats.orders.toLocaleString(),
      icon: ShoppingBag,
      color: "text-green-600",
      bg: "bg-green-50",
      href: "/orders",
    },
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/insights",
    },
    {
      title: "At-Risk Customers",
      value: stats.churnRisk.total.toLocaleString(),
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      href: "/churn",
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Welcome to GrowthMind AI
              </h1>
              <p className="text-muted-foreground text-sm">
                Your AI-powered growth agent for Brew & Grow
              </p>
            </div>
          </div>
          {!loading && (stats.customers > 0 || stats.orders > 0) && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={async () => {
                  if (confirm("Are you sure you want to clear ALL data? This will reset the platform.")) {
                    setDemoLoading(true);
                    try {
                      await demoApi.clear();
                      await loadStats();
                    } catch (error) {
                      console.error(error);
                      alert("Failed to clear data.");
                    } finally {
                      setDemoLoading(false);
                    }
                  }
                }}
                disabled={demoLoading}
              >
                Clear All Data
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => handleLoadDemo(true)}
                disabled={demoLoading}
              >
                Reload Demo Data
              </Button>
            </div>
          )}
        </div>
      </div>

      {demoResult && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-bold text-green-900 mb-2">Demo Dataset Loaded Successfully</h3>
          <div className="text-sm text-green-800 space-y-1">
            <p>Customers: {demoResult.customers}</p>
            <p>Orders: {demoResult.orders}</p>
            <p>Profiles: {demoResult.profiles}</p>
            <p className="mt-2 font-medium">Ready for AI segmentation and campaigns.</p>
          </div>
        </div>
      )}

      {showDemoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold mb-2">Replace Existing Data?</h3>
            <p className="text-muted-foreground mb-6">
              Loading the demo dataset will replace the current demo/sample data and regenerate customer profiles. Continue?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDemoModal(false)}>Cancel</Button>
              <Button onClick={() => handleLoadDemo(true)} disabled={demoLoading}>
                {demoLoading ? "Loading..." : "Load Demo Dataset"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {!loading && stats.customers === 0 && stats.orders === 0 ? (
        <Card className="mb-8 bg-blue-50/50 border-blue-100">
          <CardContent className="p-12 text-center">
            <Zap className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Get started with GrowthMind AI</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Get started by uploading your own data or loading a demo dataset to explore the platform's AI capabilities.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/customers">
                <Button variant="outline" size="lg">Upload CSV</Button>
              </Link>
              <Button size="lg" onClick={() => handleLoadDemo(false)} disabled={demoLoading}>
                {demoLoading ? "Generating demo customers, orders, profiles, and analytics..." : "Load Demo Dataset"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link href={card.href} key={card.title}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {loading ? "..." : card.value}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {card.title}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Workflow Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              AI Growth Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { step: "1", label: "Upload customer & order data", href: "/customers", done: stats.customers > 0 && stats.orders > 0 },
                { step: "2", label: "Review churn risk customers", href: "/churn", done: stats.churnRisk.total > 0 },
                { step: "3", label: "Segment audience with AI chat", href: "/chat", done: stats.analytics?.totalCampaigns > 0 },
                { step: "4", label: "Simulate & create campaign", href: "/campaigns", done: stats.analytics?.totalCampaigns > 0 },
                { step: "5", label: "Track performance & revenue", href: "/insights", done: stats.analytics?.totalCampaigns > 0 },
              ].map((item) => (
                <Link key={item.step} href={item.href}>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      item.done ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      {item.done ? "✓" : item.step}
                    </div>
                    <span className="text-sm text-foreground">{item.label}</span>
                    {item.done && (
                      <Badge variant="success" className="ml-auto text-xs">Done</Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Campaign Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.analytics?.totalCampaigns === 0 ? (
              <div className="text-center py-8">
                <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No campaigns yet. Start by segmenting your audience.
                </p>
                <Link href="/chat" className="text-sm text-primary hover:underline mt-2 inline-block">
                  Go to AI Segment →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-xl font-bold">{stats.analytics?.totalCampaigns}</p>
                    <p className="text-xs text-muted-foreground">Campaigns Sent</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-xl font-bold">{stats.analytics?.avgOpenRate}%</p>
                    <p className="text-xs text-muted-foreground">Avg Open Rate</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-xl font-bold">{stats.analytics?.avgClickRate}%</p>
                    <p className="text-xs text-muted-foreground">Avg Click Rate</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-xl font-bold">
                      {formatCurrency(stats.analytics?.totalRevenue || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Revenue Attributed</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Churn Risk Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Churn Risk Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-100">
              <p className="text-3xl font-bold text-red-600">
                {loading ? "..." : stats.churnRisk.high}
              </p>
              <p className="text-sm text-red-700 mt-1">High Risk</p>
              <p className="text-xs text-muted-foreground mt-1">No order in 45+ days</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <p className="text-3xl font-bold text-yellow-600">
                {loading ? "..." : stats.churnRisk.medium}
              </p>
              <p className="text-sm text-yellow-700 mt-1">Medium Risk</p>
              <p className="text-xs text-muted-foreground mt-1">No order in 30-45 days</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
              <p className="text-3xl font-bold text-green-600">
                {loading ? "..." : stats.customers - stats.churnRisk.total}
              </p>
              <p className="text-sm text-green-700 mt-1">Healthy</p>
              <p className="text-xs text-muted-foreground mt-1">Active customers</p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Link href="/churn" className="text-sm text-primary hover:underline">
              View all at-risk customers →
            </Link>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
