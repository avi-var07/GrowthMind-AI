"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { campaignsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  Loader2,
  Zap,
  MessageSquare,
  Mail,
  Send,
  ArrowLeft,
  BarChart2,
  Sparkles,
  CheckCircle2,
  Edit3,
} from "lucide-react";

export default function NewCampaignPage() {
  const router = useRouter();

  // Campaign state
  const [campaignName, setCampaignName] = useState("");
  const [campaignGoal, setCampaignGoal] = useState("win back inactive customers");
  const [segmentData, setSegmentData] = useState<any>(null);

  // Simulation state
  const [simulation, setSimulation] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Message state
  const [whatsappMsg, setWhatsappMsg] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [msgLoading, setMsgLoading] = useState(false);

  // Send state
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<"simulate" | "messages" | "confirm">("simulate");

  useEffect(() => {
    // Load segment data from session storage (set by chat page)
    const stored = sessionStorage.getItem("segmentData");
    if (!stored) {
      router.push("/chat");
      return;
    }
    const data = JSON.parse(stored);
    setSegmentData(data);
    setCampaignName(`Campaign - ${data.segmentDescription.slice(0, 40)}`);
  }, [router]);

  async function runSimulation() {
    if (!segmentData) return;
    setSimLoading(true);
    try {
      const res = await campaignsApi.simulate(
        segmentData.audienceIds,
        segmentData.segmentDescription
      );
      setSimulation(res.data);
      setStep("messages");
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setSimLoading(false);
    }
  }

  async function generateMessages() {
    if (!segmentData) return;
    setMsgLoading(true);
    try {
      const res = await campaignsApi.generateMessages(
        segmentData.audienceIds,
        campaignGoal
      );
      setWhatsappMsg(res.data.whatsappMessage);
      setEmailMsg(res.data.emailMessage);
      setStep("confirm");
    } catch (err) {
      console.error("Message gen failed:", err);
    } finally {
      setMsgLoading(false);
    }
  }

  async function sendCampaign() {
    if (!segmentData || !whatsappMsg || !emailMsg) return;
    setSending(true);
    try {
      const res = await campaignsApi.send({
        name: campaignName,
        segmentDescription: segmentData.segmentDescription,
        audienceIds: segmentData.audienceIds,
        whatsappMessage: whatsappMsg,
        emailMessage: emailMsg,
        predictedRevenue: simulation?.expectedRevenue || 0,
        predictedOpenRate: simulation?.expectedOpenRate || 0,
        predictedClickRate: simulation?.expectedClickRate || 0,
        confidenceScore: simulation?.confidenceScore || 0,
      });

      sessionStorage.removeItem("segmentData");
      router.push(`/campaigns/${res.data.campaignId}`);
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSending(false);
    }
  }

  if (!segmentData) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/chat")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Campaign</h1>
          <p className="text-sm text-muted-foreground">
            {segmentData.audienceCount} customers · {segmentData.segmentDescription}
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {["simulate", "messages", "confirm"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step === s
                ? "bg-primary text-white"
                : ["simulate", "messages", "confirm"].indexOf(step) > i
                ? "bg-green-500 text-white"
                : "bg-muted text-muted-foreground"
            }`}>
              {["simulate", "messages", "confirm"].indexOf(step) > i ? "✓" : i + 1}
            </div>
            <span className="text-sm capitalize hidden md:block">{s}</span>
            {i < 2 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Campaign Name */}
        <Card>
          <CardContent className="p-4">
            <label className="text-sm font-medium mb-2 block">Campaign Name</label>
            <Input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Enter campaign name..."
            />
          </CardContent>
        </Card>

        {/* Step 1: Simulation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="w-5 h-5 text-primary" />
              Step 1: Campaign Simulator
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!simulation ? (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Before sending, simulate expected results for your{" "}
                  <strong>{segmentData.audienceCount}</strong> customer audience.
                </p>
                <Button onClick={runSimulation} disabled={simLoading}>
                  {simLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Run Simulation
                </Button>
              </div>
            ) : (
              <div>
                {/* Simulation Results */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xl font-bold text-blue-700">
                      {simulation.expectedOpenRate}%
                    </p>
                    <p className="text-xs text-muted-foreground">Open Rate</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xl font-bold text-green-700">
                      {simulation.expectedClickRate}%
                    </p>
                    <p className="text-xs text-muted-foreground">Click Rate</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-xl font-bold text-purple-700">
                      {formatCurrency(simulation.expectedRevenue)}
                    </p>
                    <p className="text-xs text-muted-foreground">Exp. Revenue</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-xl font-bold text-orange-700">
                      {simulation.confidenceScore}%
                    </p>
                    <p className="text-xs text-muted-foreground">Confidence</p>
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Confidence Score</span>
                    <span className="font-medium">{simulation.confidenceScore}%</span>
                  </div>
                  <Progress value={simulation.confidenceScore} />
                </div>

                {/* AI Explanation */}
                {simulation.aiExplanation && (
                  <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                    <Sparkles className="w-4 h-4 inline mr-1" />
                    {simulation.aiExplanation}
                  </div>
                )}

                {/* Breakdown */}
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  {Object.entries(simulation.breakdown || {}).map(([key, val]) => (
                    <div key={key} className="p-2 bg-muted rounded text-xs">
                      <p className="font-bold">{val as number}</p>
                      <p className="text-muted-foreground capitalize">
                        {key.replace("estimated", "Est. ")}
                      </p>
                    </div>
                  ))}
                </div>

                <Badge variant="success" className="mt-3">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Simulation complete
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Generate Messages */}
        {simulation && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-5 h-5 text-primary" />
                Step 2: AI Message Generation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!whatsappMsg ? (
                <div>
                  <div className="mb-4">
                    <label className="text-sm font-medium mb-2 block">Campaign Goal</label>
                    <Input
                      value={campaignGoal}
                      onChange={(e) => setCampaignGoal(e.target.value)}
                      placeholder="e.g. win back inactive customers with discount"
                    />
                  </div>
                  <Button onClick={generateMessages} disabled={msgLoading}>
                    {msgLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Generate Personalized Messages
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-green-500" />
                      WhatsApp Message
                      <Edit3 className="w-3 h-3 text-muted-foreground" />
                    </label>
                    <Textarea
                      value={whatsappMsg}
                      onChange={(e) => setWhatsappMsg(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4 text-blue-500" />
                      Email Message
                      <Edit3 className="w-3 h-3 text-muted-foreground" />
                    </label>
                    <Textarea
                      value={emailMsg}
                      onChange={(e) => setEmailMsg(e.target.value)}
                      className="min-h-[140px]"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ✏️ Messages are editable. Modify before sending.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Send */}
        {whatsappMsg && emailMsg && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Send className="w-5 h-5 text-primary" />
                Step 3: Send Campaign
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted rounded-lg mb-4 text-sm space-y-1">
                <p><strong>Campaign:</strong> {campaignName}</p>
                <p><strong>Audience:</strong> {segmentData.audienceCount} customers</p>
                <p><strong>Segment:</strong> {segmentData.segmentDescription}</p>
                <p><strong>Predicted Revenue:</strong> {formatCurrency(simulation?.expectedRevenue || 0)}</p>
                <p><strong>Channels:</strong> WhatsApp + Email (alternating)</p>
              </div>
              <Button
                onClick={sendCampaign}
                disabled={sending || !campaignName}
                className="w-full"
                size="lg"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {sending
                  ? "Sending campaign..."
                  : `Send to ${segmentData.audienceCount} Customers`}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
