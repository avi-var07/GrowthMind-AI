"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { campaignsApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Megaphone, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    campaignsApi.list().then((res) => {
      setCampaigns(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function StatusBadge({ status }: { status: string }) {
    if (status === "sent") return <Badge variant="success">Sent</Badge>;
    if (status === "completed") return <Badge variant="secondary">Completed</Badge>;
    return <Badge variant="outline">Draft</Badge>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            Campaigns
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            All marketing campaigns
          </p>
        </div>
        <Link href="/chat">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No campaigns yet. Start by segmenting your audience.
            </p>
            <Link href="/chat">
              <Button>Create First Campaign</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Link key={campaign._id} href={`/campaigns/${campaign._id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{campaign.name}</h3>
                        <StatusBadge status={campaign.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                        {campaign.segmentDescription}
                      </p>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>
                          <strong className="text-foreground">{campaign.audienceSize}</strong>{" "}
                          customers
                        </span>
                        <span>
                          Predicted:{" "}
                          <strong className="text-foreground">
                            {formatCurrency(campaign.predictedRevenue)}
                          </strong>
                        </span>
                        <span>
                          Open Rate:{" "}
                          <strong className="text-foreground">
                            {campaign.predictedOpenRate}%
                          </strong>
                        </span>
                        <span>
                          Confidence:{" "}
                          <strong className="text-foreground">
                            {campaign.confidenceScore}%
                          </strong>
                        </span>
                        <span>{formatDate(campaign.createdAt)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground ml-4 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
