"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { segmentApi, campaignsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  MessageSquare,
  Send,
  Users,
  Lightbulb,
  ChevronRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";

// Example prompts to help the marketer get started
const EXAMPLE_PROMPTS = [
  "Bring back inactive high-value customers",
  "Customers who spent more than ₹3000 and have not ordered in 30 days",
  "Target coffee lovers who purchased premium beans",
  "High risk churn customers who love Cold Brew",
  "VIP customers who haven't ordered in 2 months",
  "Customers from Mumbai who ordered Latte",
];

interface SegmentResult {
  prompt: string;
  filters: Record<string, any>;
  explanation: string;
  audienceCount: number;
  audiencePreview: any[];
  allAudienceIds: string[];
  churnBreakdown: { high: number; medium: number; low: number };
  categoryBreakdown: Record<string, number>;
}

export default function ChatPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SegmentResult | null>(null);
  const [error, setError] = useState("");
  const [proceedingToSim, setProceedingToSim] = useState(false);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await segmentApi.chat(prompt.trim());
      setResult(res.data);
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Failed to process. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleExampleClick(example: string) {
    setPrompt(example);
  }

  async function proceedToCampaign() {
    if (!result) return;
    setProceedingToSim(true);

    // Store segment data in session storage for campaign creation flow
    sessionStorage.setItem(
      "segmentData",
      JSON.stringify({
        audienceIds: result.allAudienceIds,
        audienceCount: result.audienceCount,
        segmentDescription: result.prompt,
        explanation: result.explanation,
      })
    );

    router.push("/campaigns/new");
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          AI Audience Segmentation
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Describe your target audience in plain English. AI will find them.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Chat Input */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder='Try: "Bring back inactive high-value customers"'
                  className="flex-1"
                  disabled={loading}
                />
                <Button type="submit" disabled={loading || !prompt.trim()}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              {/* Audience Found */}
              <Card className="border-green-100">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Audience Found: {result.audienceCount} customers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Explanation - WHY these customers were selected */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs font-medium text-blue-700 mb-1">
                      Why these customers were selected:
                    </p>
                    <p className="text-sm text-blue-800 whitespace-pre-line">
                      {result.explanation}
                    </p>
                  </div>

                  {/* Applied Filters */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Applied Filters:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(result.filters).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {String(value)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-lg font-bold text-red-600">
                        {result.churnBreakdown.high}
                      </p>
                      <p className="text-xs text-muted-foreground">High Risk</p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <p className="text-lg font-bold text-yellow-600">
                        {result.churnBreakdown.medium}
                      </p>
                      <p className="text-xs text-muted-foreground">Medium Risk</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-lg font-bold text-green-600">
                        {result.churnBreakdown.low}
                      </p>
                      <p className="text-xs text-muted-foreground">Low Risk</p>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border rounded-lg overflow-hidden mb-4">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">City</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Spend</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Inactive</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Favorite</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.audiencePreview.map((c) => (
                          <tr key={c.customerId} className="border-b">
                            <td className="p-3 font-medium">{c.name}</td>
                            <td className="p-3 text-muted-foreground">{c.city}</td>
                            <td className="p-3">{formatCurrency(c.totalSpend)}</td>
                            <td className="p-3">
                              <span className="text-red-600 text-xs">
                                {c.daysSinceLastOrder}d ago
                              </span>
                            </td>
                            <td className="p-3">
                              <Badge variant="secondary" className="text-xs">
                                {c.favoriteCategory}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {result.audienceCount > 10 && (
                      <div className="p-3 text-xs text-muted-foreground text-center bg-muted/30">
                        Showing 10 of {result.audienceCount} customers
                      </div>
                    )}
                  </div>

                  {/* Proceed Button */}
                  <Button
                    onClick={proceedToCampaign}
                    className="w-full"
                    disabled={proceedingToSim || result.audienceCount === 0}
                  >
                    {proceedingToSim ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <ChevronRight className="w-4 h-4 mr-2" />
                    )}
                    Create Campaign for {result.audienceCount} Customers
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right: Example Prompts */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                Example Prompts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex}
                  onClick={() => handleExampleClick(ex)}
                  className="w-full text-left p-3 text-xs rounded-lg bg-muted hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                >
                  "{ex}"
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                What AI Can Filter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>• Total spend amount</p>
              <p>• Days since last order</p>
              <p>• Favorite coffee category</p>
              <p>• Churn risk level</p>
              <p>• Number of orders</p>
              <p>• Customer tags (VIP, Inactive...)</p>
              <p>• Average order value</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
