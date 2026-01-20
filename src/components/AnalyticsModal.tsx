import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  X,
  Calendar,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { eveApi, type AnalyticsPeriod, type FunnelMetrics, type SkillInsights } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AnalyticsModalProps {
  open: boolean;
  onClose: () => void;
}

export function AnalyticsModal({ open, onClose }: AnalyticsModalProps) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<AnalyticsPeriod>("all");

  const { data: funnelData, isLoading: funnelLoading } = useQuery({
    queryKey: ["funnel-metrics", period],
    queryFn: () => eveApi.getFunnelMetrics(period),
    enabled: open,
  });

  const { data: skillsData, isLoading: skillsLoading } = useQuery({
    queryKey: ["skill-insights"],
    queryFn: () => eveApi.getSkillInsights(),
    enabled: open,
  });

  if (!open) return null;

  const funnel = funnelData;
  const skills = skillsData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 m-4">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-md border-b border-border/40 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t('analytics.title')}</h2>
              <p className="text-xs text-muted-foreground">{t('analytics.subtitle')}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Period Selector */}
        <div className="px-4 pt-4">
          <Select value={period} onValueChange={(v) => setPeriod(v as AnalyticsPeriod)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t('analytics.period.week')}</SelectItem>
              <SelectItem value="month">{t('analytics.period.month')}</SelectItem>
              <SelectItem value="all">{t('analytics.period.all')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {(funnelLoading || skillsLoading) && (
          <div className="p-8 flex items-center justify-center">
            <div className="h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {/* Funnel Section */}
        {!funnelLoading && funnel && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <Card className="bg-blue-500/5 border-blue-500/10">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{funnel.inbox}</div>
                  <div className="text-xs text-muted-foreground">Inbox</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/10">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{funnel.applied}</div>
                  <div className="text-xs text-muted-foreground">Applied</div>
                </CardContent>
              </Card>
              <Card className="bg-accent/5 border-accent/10">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-accent">{funnel.interview}</div>
                  <div className="text-xs text-muted-foreground">Interview</div>
                </CardContent>
              </Card>
              <Card className="bg-green-500/5 border-green-500/10">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{funnel.offer}</div>
                  <div className="text-xs text-muted-foreground">Offers</div>
                </CardContent>
              </Card>
            </div>

            {/* Conversion Rates */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {t('analytics.conversionRates')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Inbox → Applied</span>
                  <Badge variant="secondary">{(funnel.conversionRates.applyRate * 100).toFixed(1)}%</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Applied → Interview</span>
                  <Badge variant="secondary">{(funnel.conversionRates.interviewRate * 100).toFixed(1)}%</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Interview → Offer</span>
                  <Badge variant="secondary">{(funnel.conversionRates.offerRate * 100).toFixed(1)}%</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Funnel Visualization - Simple Bar Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('analytics.funnel')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { label: 'Inbox', value: funnel.inbox, color: 'bg-blue-500' },
                    { label: 'Applied', value: funnel.applied, color: 'bg-primary' },
                    { label: 'Interview', value: funnel.interview, color: 'bg-accent' },
                    { label: 'Offer', value: funnel.offer, color: 'bg-green-500' },
                  ].map((item) => {
                    const maxValue = Math.max(funnel.inbox, funnel.applied, funnel.interview, funnel.offer) || 1;
                    const widthPercent = (item.value / maxValue) * 100;
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="w-20 text-xs text-muted-foreground">{item.label}</span>
                        <div className="flex-1 h-6 bg-muted/30 rounded overflow-hidden">
                          <div
                            className={cn("h-full transition-all duration-500", item.color)}
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                        <span className="w-8 text-xs font-medium text-right">{item.value}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Skills Section */}
        {!skillsLoading && skills && (
          <div className="p-4 pt-0 space-y-4">
            {/* Top Skills */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  {t('analytics.topSkills')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {skills.top.slice(0, 8).map((skill) => (
                    <div key={skill.skill} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{skill.skill}</span>
                      <Badge variant="outline">{skill.matchCount} {t('analytics.matches')}</Badge>
                    </div>
                  ))}
                  {skills.top.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      No skill data available yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Skill Gaps */}
            {skills.gaps.length > 0 && (
              <Card className="border-yellow-500/20 bg-yellow-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
                    <AlertTriangle className="h-4 w-4" />
                    {t('analytics.skillGaps')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {skills.gaps.slice(0, 5).map((gap) => (
                      <div key={gap.skill} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{gap.skill}</span>
                          {!gap.inResume && (
                            <Badge variant="destructive" className="text-[10px]">Missing</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {gap.mentionCount} {t('analytics.mentions')}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
