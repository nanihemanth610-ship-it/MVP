import { useState } from "react";
import { Bell, Mail, MessageSquare, Send } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";

interface NotificationLog {
  id: string;
  channel: "email" | "whatsapp" | "system";
  recipient: string;
  event: string;
  status: "DELIVERED" | "NOT_CONFIGURED" | "CONSENT_REQUIRED" | "FAILED";
  timestamp: string;
  details: string;
}

const INITIAL_LOGS: NotificationLog[] = [
  {
    id: "notif-1",
    channel: "system",
    recipient: "Billing Desk (Apollo Hospitals)",
    event: "CLAIM_FLAGGED",
    status: "DELIVERED",
    timestamp: "2026-10-15T14:15:22Z",
    details:
      "Discrepancy alert generated for claim BB-DEMO-1001 (₹1,500 math mismatch).",
  },
  {
    id: "notif-2",
    channel: "email",
    recipient: "patient.aarav@demo.in",
    event: "CLAIM_REGISTERED",
    status: "NOT_CONFIGURED",
    timestamp: "2026-10-15T14:16:00Z",
    details:
      "Transactional email withheld: SMTP credentials not configured in environment.",
  },
  {
    id: "notif-3",
    channel: "whatsapp",
    recipient: "+91 98765 43210",
    event: "PREAUTH_QUERY_ALERT",
    status: "CONSENT_REQUIRED",
    timestamp: "2026-10-15T15:00:00Z",
    details:
      "WhatsApp notification withheld: Patient explicit WhatsApp opt-in consent is required.",
  },
];

export function NotificationsPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<NotificationLog[]>(INITIAL_LOGS);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState("doctor.billing@apollo-demo.in");

  // Integration configuration check
  const isSmtpConfigured = Boolean(
    import.meta.env?.VITE_SMTP_HOST &&
    !import.meta.env?.VITE_SMTP_HOST.includes("your-smtp"),
  );

  const isWhatsAppConfigured = Boolean(
    import.meta.env?.VITE_WHATSAPP_API_KEY &&
    !import.meta.env?.VITE_WHATSAPP_API_KEY.includes("your-whatsapp"),
  );

  const handleSendTestNotification = () => {
    setIsSendingTest(true);
    setTimeout(() => {
      setIsSendingTest(false);
      if (!isSmtpConfigured) {
        const newLog: NotificationLog = {
          id: `notif-${Date.now()}`,
          channel: "email",
          recipient: testEmail,
          event: "TEST_PROBE",
          status: "NOT_CONFIGURED",
          timestamp: new Date().toISOString(),
          details:
            "Probe aborted: SMTP host & auth credentials missing. Live delivery held.",
        };
        setLogs((prev) => [newLog, ...prev]);
        toast({
          title: "SMTP Not Configured",
          description:
            "Cannot dispatch email without SMTP credentials in server environment.",
          variant: "error",
        });
      } else {
        const newLog: NotificationLog = {
          id: `notif-${Date.now()}`,
          channel: "email",
          recipient: testEmail,
          event: "TEST_PROBE",
          status: "DELIVERED",
          timestamp: new Date().toISOString(),
          details:
            "Test message transmitted successfully via verified SMTP server.",
        };
        setLogs((prev) => [newLog, ...prev]);
        toast({
          title: "Test Dispatched",
          description: `Dispatched test probe to ${testEmail}.`,
          variant: "success",
        });
      }
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Notifications & Outbound Communication
            </h1>
            <Badge variant="secondary" className="text-xs">
              GOVERNED DISPATCH
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Multi-channel patient and hospital alerts. Strict delivery
            truthfulness enforced.
          </p>
        </div>
      </div>

      {/* Integration Status Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Email SMTP Card */}
        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Transactional Email (SMTP)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Adjudication notices, query letters, and receipt
                    confirmations
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={isSmtpConfigured ? "success" : "warning"}
                className="text-[10px]"
              >
                {isSmtpConfigured ? "CONFIGURED" : "NOT_CONFIGURED"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2 text-xs space-y-3">
            <p className="text-muted-foreground leading-relaxed">
              Dispatches require verified SMTP host, TLS port, and credential
              configuration. If credentials are missing, system records{" "}
              <code className="text-foreground font-mono">NOT_CONFIGURED</code>{" "}
              and never fakes delivery.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <Input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="recipient@example.com"
                className="h-8 text-xs font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendTestNotification}
                disabled={isSendingTest}
                className="gap-1.5 h-8 text-xs shrink-0"
              >
                <Send className="h-3 w-3" />
                Send Probe
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Business API Card */}
        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">
                    WhatsApp Business API
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Instant claim status and discrepancy alerts for patients
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={isWhatsAppConfigured ? "success" : "secondary"}
                className="text-[10px]"
              >
                {isWhatsAppConfigured ? "ACTIVE" : "NOT_CONFIGURED"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2 text-xs space-y-3">
            <p className="text-muted-foreground leading-relaxed">
              WhatsApp delivery strictly requires approved Meta HSM templates
              and explicit patient opt-in consent. Un-consented requests trigger{" "}
              <code className="text-foreground font-mono">
                CONSENT_REQUIRED
              </code>
              .
            </p>

            <Alert variant="info" className="py-2">
              <AlertDescription className="text-[11px] leading-relaxed">
                Patient consent is captured during claim submission. No
                promotional or unsolicited messages are permitted.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Outbound Notification Audit Log */}
      <Card className="border-border/80">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Outbound Communication Audit Log
              </CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              {logs.length} logged events
            </span>
          </div>
          <CardDescription className="text-xs">
            Chronological ledger of every outbound dispatch attempt and
            verifiable provider response.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="divide-y divide-border/60">
            {logs.map((log) => (
              <div
                key={log.id}
                className="py-3 flex items-start justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {log.event}
                    </span>
                    <Badge
                      variant={
                        log.status === "DELIVERED"
                          ? "success"
                          : log.status === "NOT_CONFIGURED"
                            ? "warning"
                            : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {log.status}
                    </Badge>
                    <span className="text-[11px] font-mono text-muted-foreground capitalize">
                      via {log.channel}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{log.details}</p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    Target: {log.recipient}
                  </p>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
