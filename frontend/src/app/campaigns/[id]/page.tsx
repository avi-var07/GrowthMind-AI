"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { campaignsApi, analyticsApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  RefreshCw,
  Send,
  CheckCircle,
  Eye,
  MousePointer,
  XCircle,
  Clock,
  BarChart2,
  BookOpen,
} from "lucide-react";

interface CampaignStats {
  total: number;
  pending: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  attributedRevenue: number;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<any>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [communications, setCommunications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [savingLearning, setSavingLearning] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [campaignRes, commsRes] = await Promise.all([
        campaignsApi.get(id),
        campaignsApi.communications(id),
      ]);
      setCampaign(campaignRes.data.campaign);
      setStats(campaignRes.data.stats);
      setCommunications(commsRes.data.communications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Simple polling for live updates
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [loadData, autoRefresh]);

  async function saveToMemory() {
    setSavingLearning(true);
    try {
      await analyticsApi.saveLearning(id);
      alert("Campaign learning saved to Marketing Memory!");
    } catch {
      alert("Failed to save learning.");
    } finally {
      setSavingLearning(false);
    }
  }

  function StatusBadge({ status }: { status: string }) {
    const configs: Record<string, any> = {
      PENDING: { variant: "outline", icon: Clock, label: "Pending" },
      DELIVERED: { variant: "secondary", icon: CheckCircle, label: "Delivered" },
      OPENED: { variant: "success", icon: Eye, label: "Opened" },
      CLICKED: { variant: "success", icon: MousePointer, label: "Clicked" },
      FAILED: { variant: "danger", icon: XCircle, label: "Failed" },
    };
    const config = configs[status] || configs.PENDING;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="text-xs">
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">Loading campaign...</div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-8 text-center text-muted-foreground">Campaign not found.</div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/campaigns")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Campaigns
        </Button>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {campaign.segmentDescription}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant={campaign.status === "sent" ? "success" : "secondary"}>
              {campaign.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Sent {formatDate(campaign.sentAt || campaign.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: "Sent", value: stats.total, icon: Send, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Delivered", value: stats.delivered, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
            { label: "Opened", value: stats.opened, icon: Eye, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Clicked", value: stats.clicked, icon: MousePointer, color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Failed", value: stats.failed, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label}>
                <CardContent className="p-4 text-center">
                  <div className={`w-8 h-8 ${item.bg} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Rate Bars */}
      {stats && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              Performance Rates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Delivery Rate", value: stats.deliveryRate, color: "bg-green-500" },
              { label: "Open Rate", value: stats.openRate, color: "bg-purple-500" },
              { label: "Click Rate", value: stats.clickRate, color: "bg-orange-500" },
            ].map((metric) => (
              <div key={metric.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{metric.label}</span>
                  <span className="font-bold">{metric.value}%</span>
                </div>
                <Progress value={metric.value} />
              </div>
            ))}

            <div className="pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Attributed Revenue</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(stats.attributedRevenue)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Orders placed within 7 days of clicking
              </p>
            </div>

            {/* Predicted vs Actual */}
            <div className="pt-3 border-t">
              <p className="text-sm font-medium mb-2">Predicted vs Actual</p>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div>
                  <p className="text-muted-foreground">Open Rate</p>
                  <p className="font-medium text-orange-500">
                    {campaign.predictedOpenRate}% → {stats.openRate}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Click Rate</p>
                  <p className="font-medium text-blue-500">
                    {campaign.predictedClickRate}% → {stats.clickRate}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Revenue</p>
                  <p className="font-medium text-green-500">
                    {formatCurrency(campaign.predictedRevenue)} → {formatCurrency(stats.attributedRevenue)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save to Marketing Memory */}
      <Card className="mb-6 border-amber-100 bg-amber-50">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-800">
              Save to Marketing Memory
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Store this campaign's performance to improve future AI recommendations
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={saveToMemory}
            disabled={savingLearning}
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
          >
            <BookOpen className="w-4 h-4 mr-1" />
            {savingLearning ? "Saving..." : "Save Learning"}
          </Button>
        </CardContent>
      </Card>

      {/* Communications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Communication Logs
            {autoRefresh && (
              <span className="ml-2 text-xs text-green-500 font-normal animate-pulse">
                • Live
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Channel</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Message (preview)</th>
                </tr>
              </thead>
              <tbody>
                {communications.map((comm) => (
                  <tr key={comm._id} className="border-b hover:bg-muted/30">
                    <td className="p-4">
                      <p className="font-medium">{comm.customerId?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{comm.customerId?.email}</p>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="text-xs capitalize">
                        {comm.channel}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={comm.status} />
                    </td>
                    <td className="p-4 text-xs text-muted-foreground max-w-[250px] truncate">
                      {comm.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
