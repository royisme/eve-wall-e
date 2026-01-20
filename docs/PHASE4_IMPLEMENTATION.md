# Phase 4: PDF & Analytics Features - Implementation Plan

> **Status**: Ready for Implementation
> **Target**: Wall-E Chrome Extension
> **Reference**: `docs/JOBS_DESIGN.md` Phase 4
> **Date**: 2026-01-19

---

## Executive Summary

Implement PDF generation and analytics features for Wall-E Chrome Extension. This involves:
1. **PDF Generation (Frontend)**: Build and download PDF resumes in the browser with template selection
2. **Optional PDF Upload**: Save generated PDF files to Eve for archival/sharing
3. **Analytics Dashboard**: Funnel metrics, conversion rates, and skill insights
4. **Resume Library Polish**: Edit content functionality
5. **Workspace Enhancement**: Gap analysis panel, match score display

**Note**: Eve stores Markdown as the source of truth. PDF files are derived in the frontend and optionally uploaded for storage. Backend PDF generation is not required.

---

## Implementation Phases

### Phase 4.1: API Layer Extensions (~1h)

**File**: `src/lib/api.ts`

Add new types and API functions.

#### New Types to Add

```typescript
// Analytics Types
export type AnalyticsPeriod = "week" | "month" | "all";

export interface FunnelMetrics {
  inbox: number;
  applied: number;
  interview: number;
  offer: number;
  conversionRates: {
    applyRate: number;      // applied / inbox
    interviewRate: number;  // interview / applied
    offerRate: number;       // offer / interview
  };
}

export interface SkillMatch {
  skill: string;
  matchCount: number;
}

export interface SkillGap {
  skill: string;
  mentionCount: number;
  inResume: boolean;
}

export interface SkillInsights {
  top: SkillMatch[];
  gaps: SkillGap[];
}

// PDF Types
export type PdfTemplate = "modern" | "classic" | "minimal";

export interface PdfUploadResponse {
  filename: string;
  size: number;
  url?: string;
}

// Resume Status & Versions
export interface ResumeStatus {
  parse_status: "success" | "partial" | "failed" | "parsing";
  errors?: string[];
}

export interface ResumeVersionsResponse {
  versions: TailoredResume[];
}

// Manual Job Creation
export interface CreateJobRequest {
  title: string;
  company: string;
  url: string;
  location?: string;
  source?: "linkedin" | "indeed" | "email" | "manual";
}
```

#### New API Functions to Add

```typescript
// Resume Status & Versions
export async function getResumeStatus(id: number): Promise<ResumeStatus> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/resumes/${id}/status`);
  return res.json();
}

export async function getResumeVersions(id: number): Promise<ResumeVersionsResponse> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/resumes/${id}/versions`);
  return res.json();
}

// PDF Upload (frontend-generated)
export async function uploadTailoredPdf(
  tailoredResumeId: number,
  file: Blob,
  filename: string
): Promise<PdfUploadResponse> {
  const baseUrl = await getBaseUrl();
  const form = new FormData();
  form.append("file", file, filename);
  const res = await fetchWithAuth(`${baseUrl}/resumes/tailored/${tailoredResumeId}/pdf`, {
    method: "POST",
    body: form,
  });
  return res.json();
}

// Analytics
export async function getFunnelMetrics(
  period: AnalyticsPeriod = "all"
): Promise<FunnelMetrics> {
  const baseUrl = await getBaseUrl();
  const query = period ? `?period=${period}` : "";
  const res = await fetchWithAuth(`${baseUrl}/analytics/funnel${query}`);
  return res.json();
}

export async function getSkillInsights(): Promise<SkillInsights> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/analytics/skills`);
  return res.json();
}

// Manual Job Creation
export async function createJob(data: CreateJobRequest): Promise<{ job: Job }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/jobs`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}
```

#### Update `eveApi` Export

Adds new functions to the exported `eveApi` object:
```typescript
export const eveApi = {
  // Existing exports...

  // Resume Status & Versions
  getResumeStatus,
  getResumeVersions,

  // PDF Upload
  uploadTailoredPdf,

  // Analytics
  getFunnelMetrics,
  getSkillInsights,

  // Manual Job Creation
  createJob,
};
```

---

### Phase 4.2: Core Components (~2h)

#### 1. Create `src/components/GapAnalysisPanel.tsx`

Displays skill gaps, strengths, and suggestions from job analysis.

```typescript
import { AlertCircle, CheckCircle, Lightbulb, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type JobAnalysis } from "@/lib/api";
import { useTranslation } from "react-i18next";

interface GapAnalysisPanelProps {
  analysis: JobAnalysis | null;
  matchScore?: number;
}

export function GapAnalysisPanel({ analysis, matchScore }: GapAnalysisPanelProps) {
  const { t } = useTranslation();

  if (!analysis) {
    return (
      <Card className="bg-muted/20 border-dashed">
        <CardContent className="p-6 text-center">
          <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">{t('gapAnalysis.noAnalysis')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{t('gapAnalysis.title')}</span>
          {matchScore !== undefined && (
            <Badge className="text-sm px-3 py-1">
              {matchScore}% {t('gapAnalysis.match')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Match Score Summary */}
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl">
          <span className="text-sm font-medium">{t('gapAnalysis.overallScore')}</span>
          <span className={`text-2xl font-bold ${
            analysis.overallScore >= 80 ? 'text-green-600' :
            analysis.overallScore >= 60 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {analysis.overallScore}%
          </span>
        </div>

        {/* Strengths */}
        {analysis.strengths.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-green-600 uppercase tracking-wider">
              <CheckCircle className="h-3.5 w-3.5" />
              {t('gapAnalysis.strengths')} ({analysis.strengths.length})
            </div>
            <div className="space-y-1.5">
              {analysis.strengths.map((strength, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground bg-green-500/5 p-2 rounded-lg">
                  <span className="mt-0.5 text-green-600">•</span>
                  <span>{strength}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gaps */}
        {analysis.gaps.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-yellow-600 uppercase tracking-wider">
              <AlertCircle className="h-3.5 w-3.5" />
              {t('gapAnalysis.gaps')} ({analysis.gaps.length})
            </div>
            <div className="space-y-1.5">
              {analysis.gaps.map((gap, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground bg-yellow-500/5 p-2 rounded-lg">
                  <X className="h-3.5 w-3.5 text-yellow-600 shrink-0 mt-0.5" />
                  <span>{gap}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {analysis.suggestions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
              <Lightbulb className="h-3.5 w-3.5" />
              {t('gapAnalysis.suggestions')} ({analysis.suggestions.length})
            </div>
            <div className="space-y-1.5">
              {analysis.suggestions.map((suggestion, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground bg-primary/5 p-2 rounded-lg">
                  <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

#### 2. Create `src/components/PdfBuilder.tsx`

Component for generating and downloading PDFs with template selection. PDF generation happens in the browser, and the generated file can be optionally uploaded to Eve for storage.

```typescript
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FileText, Download, Loader2, CheckCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { eveApi, type PdfTemplate } from "@/lib/api";

interface PdfBuilderProps {
  markdown: string;
  filename?: string;
  tailoredResumeId?: number;
  onComplete?: () => void;
}

async function generatePdfBlob(markdown: string, template: PdfTemplate): Promise<Blob> {
  const html = renderPdfHtml(markdown, template);
  return await htmlToPdfBlob(html);
}

export function PdfBuilder({ markdown, filename = "resume", tailoredResumeId, onComplete }: PdfBuilderProps) {
  const { t } = useTranslation();
  const [template, setTemplate] = useState<PdfTemplate>("modern");

  const generateMutation = useMutation({
    mutationFn: async () => {
      const blob = await generatePdfBlob(markdown, template);
      if (tailoredResumeId) {
        await eveApi.uploadTailoredPdf(tailoredResumeId, blob, `${filename}.pdf`);
      }
      return blob;
    },
    onSuccess: async (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onComplete?.();
    },
  });

  const templates: { value: PdfTemplate; label: string; icon: string }[] = [
    { value: "modern", label: t('pdf.templates.modern'), icon: "✨" },
    { value: "classic", label: t('pdf.templates.classic'), icon: "📄" },
    { value: "minimal", label: t('pdf.templates.minimal'), icon: "◽" },
  ];

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold">{t('pdf.buildTitle')}</span>
              {generateMutation.isSuccess && (
                <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle className="h-2.5 w-2.5 mr-1" />
                  {t('pdf.ready')}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t('pdf.buildDescription')}</p>
          </div>

          <Select value={template} onValueChange={(v) => setTemplate(v as PdfTemplate)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {templates.map((tpl) => (
                <SelectItem key={tpl.value} value={tpl.value} className="text-xs">
                  <span className="mr-2">{tpl.icon}</span>
                  {tpl.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            disabled={generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
            className="h-8 shrink-0"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('pdf.generating')}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t('pdf.download')}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Phase 4.3: Modal Components (~2h)

#### 1. Create `src/components/AnalyticsModal.tsx`

Modal displaying funnel metrics and skill insights with visual charts.

```typescript
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

  const { data: funnelData } = useQuery({
    queryKey: ["funnel-metrics", period],
    queryFn: () => eveApi.getFunnelMetrics(period),
    enabled: open,
  });

  const { data: skillsData } = useQuery({
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

        {/* Funnel Section */}
        <div className="p-4 space-y-4">
          {funnel && (
            <>
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
            </>
          )}
        </div>

        {/* Skills Section */}
        <div className="p-4 pt-0 space-y-4">
          {skills && (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### 2. Create `src/components/ResumeEditorModal.tsx`

Modal for editing resume content using Milkdown editor.

```typescript
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { X, Save, Loader2, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { eveApi, type Resume } from "@/lib/api";
import { MilkdownEditor } from "./MilkdownEditor";

interface ResumeEditorModalProps {
  open: boolean;
  resume: Resume | null;
  onClose: () => void;
}

export function ResumeEditorModal({ open, resume, onClose }: ResumeEditorModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (resume) {
      setName(resume.name);
      setContent(resume.content);
      setIsDirty(false);
    }
  }, [resume]);

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; name: string; content: string }) =>
      eveApi.updateResume(data.id, { name: data.name, content: data.content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      setIsDirty(false);
      onClose();
    },
  });

  const handleSave = () => {
    if (resume && (isDirty || name !== resume.name)) {
      updateMutation.mutate({ id: resume.id, name, content });
    }
  };

  if (!open || !resume) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-background rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileCode className="h-5 w-5 text-primary" />
            </div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-64 font-semibold border-transparent bg-transparent focus:border-border"
              placeholder="Resume name..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={!isDirty && name === resume.name}
              onClick={handleSave}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.save')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('common.save')}
                </>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <MilkdownEditor
            initialValue={content}
            onChange={(newContent) => {
              setContent(newContent);
              setIsDirty(newContent !== resume.content);
            }}
            className="h-full"
          />
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/40 bg-muted/20">
          <div className="text-xs text-muted-foreground">
            {content.length} {t('resume.characters')}
          </div>
          {isDirty && (
            <div className="flex items-center gap-1 text-xs text-yellow-600 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
              {t('resume.unsavedChanges')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### Phase 4.4: Component Integration (~1h)

#### 1. Modify `src/components/JobsList.tsx`

Add analytics modal integration.

**Add imports:**
```typescript
import { AnalyticsModal } from "@/components/AnalyticsModal";
import { BarChart3 } from "lucide-react";
```

**Add state:**
```typescript
const [showAnalytics, setShowAnalytics] = useState(false);
```

**Add stats button in header (after sync button, around line 118):**
```typescript
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8 rounded-lg"
  onClick={() => setShowAnalytics(true)}
  title={t('jobs.viewAnalytics')}
>
  <BarChart3 className="h-4 w-4" />
</Button>
```

**Add modal at end of component return (before closing div):**
```typescript
{showAnalytics && <AnalyticsModal open={showAnalytics} onClose={() => setShowAnalytics(false)} />}
```

#### 2. Modify `src/components/ResumeLibrary.tsx`

Add edit content functionality.

**Add imports:**
```typescript
import { ResumeEditorModal } from "@/components/ResumeEditorModal";
```

**Add state:**
```typescript
const [editingResume, setEditingResume] = useState<Resume | null>(null);
```

**Update "Edit Content" dropdown item onClick (around line 267):**
```typescript
<DropdownMenuItem
  className="text-xs py-2 rounded-lg"
  onClick={() => setEditingResume(resume)}
>
  <FileCode className="h-3.5 w-3.5 mr-2" />
  Edit Content
</DropdownMenuItem>
```

**Add modal at end of component return (before closing div):**
```typescript
{editingResume && (
  <ResumeEditorModal
    open={!!editingResume}
    resume={editingResume}
    onClose={() => setEditingResume(null)}
  />
)}
```

#### 3. Modify `src/workspace/Workspace.tsx`

Add PDF button and gap analysis panel.

**Add imports:**
```typescript
import { PdfBuilder } from "@/components/PdfBuilder";
import { GapAnalysisPanel } from "@/components/GapAnalysisPanel";
import { FileText } from "lucide-react";
```

**Add to header - PDF button (after New Version button, around line 164):**
```typescript
<Button
  variant="outline"
  size="sm"
  className="h-8 text-xs"
  onClick={() => {/* PDF generation is handled by PdfBuilder component below */}}
>
  <FileText className="h-3.5 w-3.5 mr-2" />
  Build PDF
</Button>
```

**Add GapAnalysisPanel in left panel (below Job Description header, around line 188):**
```typescript
{jobData?.analysis && (
  <div className="p-4 border-t border-border/40">
    <GapAnalysisPanel analysis={jobData.analysis} matchScore={jobData.analysis.overallScore} />
  </div>
)}
```

**Add PdfBuilder (at bottom of left panel or in a card below editor, around line 193):**
```typescript
<div className="p-4 border-t border-border/40 bg-muted/10">
  <PdfBuilder
    markdown={content}
    filename={`${job?.title}-${job?.company}`}
    onComplete={() => {/* optional: show success toast */}}
  />
</div>
```

#### 4. Modify `src/components/JobDetailDrawer.tsx`

Add PDF generation action.

**Add imports:**
```typescript
import { FileText } from "lucide-react";
import { PdfBuilder } from "@/components/PdfBuilder";
```

**Add state:**
```typescript
const [showPdfBuilder, setShowPdfBuilder] = useState(false);
```

**Add PDF button (after Tailor Resume button, around line 318):**
```typescript
{analysis && (
  <Card>
    <CardContent className="p-3">
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setShowPdfBuilder(true)}
      >
        <FileText className="h-4 w-4 mr-2" />
        {t('jobDetail.buildPdf')}
      </Button>
    </CardContent>
  </Card>
)}

{showPdfBuilder && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div className="w-full max-w-lg bg-background rounded-2xl p-4 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">{t('pdf.buildTitle')}</h3>
        <Button variant="ghost" size="icon" onClick={() => setShowPdfBuilder(false)}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      <PdfBuilder
        markdown={content}
        filename={`${job.title}-${job.company}`}
        onComplete={() => setShowPdfBuilder(false)}
      />
    </div>
  </div>
)}
```

Also need to add:
```typescript
import { X } from "lucide-react";
```

---

### Phase 4.5: Internationalization (~30min)

Add translation keys to both English and Chinese locale files.

**File**: `src/i18n/locales/en.json`

```json
{
  "analytics": {
    "title": "Application Analytics",
    "subtitle": "Track your job search progress and insights",
    "period": {
      "week": "This Week",
      "month": "This Month",
      "all": "All Time"
    },
    "funnel": "Application Funnel",
    "conversionRates": "Conversion Rates",
    "topSkills": "Top Performing Skills",
    "skillGaps": "Skills to Address",
    "matches": "matches",
    "mentions": "mentions"
  },
  "gapAnalysis": {
    "title": "Gap Analysis",
    "noAnalysis": "Run an analysis to see skill gaps and suggestions",
    "match": "Match",
    "overallScore": "Overall Match",
    "strengths": "Strengths",
    "gaps": "Gaps",
    "suggestions": "Suggestions"
  },
  "pdf": {
    "buildTitle": "Build PDF",
    "buildDescription": "Generate a professional PDF resume",
    "templates": {
      "modern": "Modern",
      "classic": "Classic",
      "minimal": "Minimal"
    },
    "generating": "Generating...",
    "download": "Download",
    "ready": "Ready"
  },
  "resume": {
    "characters": "characters",
    "unsavedChanges": "Unsaved changes"
  },
  "jobs": {
    "viewAnalytics": "View Analytics"
  },
  "jobDetail": {
    "buildPdf": "Build PDF Resume"
  }
}
```

**File**: `src/i18n/locales/zh.json`

```json
{
  "analytics": {
    "title": "求职分析",
    "subtitle": "跟踪您的求职进度和洞察",
    "period": {
      "week": "本周",
      "month": "本月",
      "all": "全部"
    },
    "funnel": "求职漏斗",
    "conversionRates": "转化率",
    "topSkills": "热门技能",
    "skillGaps": "待提升技能",
    "matches": "次匹配",
    "mentions": "次提及"
  },
  "gapAnalysis": {
    "title": "差距分析",
    "noAnalysis": "运行分析以查看技能差距和建议",
    "match": "匹配度",
    "overallScore": "总体匹配度",
    "strengths": "优势",
    "gaps": "差距",
    "suggestions": "建议"
  },
  "pdf": {
    "buildTitle": "生成 PDF",
    "buildDescription": "生成专业的 PDF 简历",
    "templates": {
      "modern": "现代",
      "classic": "经典",
      "minimal": "简约"
    },
    "generating": "生成中...",
    "download": "下载",
    "ready": "就绪"
  },
  "resume": {
    "characters": "字符",
    "unsavedChanges": "未保存的更改"
  },
  "jobs": {
    "viewAnalytics": "查看分析"
  },
  "jobDetail": {
    "buildPdf": "生成 PDF 简历"
  }
}
```

---

## Critical Files to Modify

| File | Changes |
|------|----------|
| `src/lib/api.ts` | Add new types and API functions |
| `src/components/JobsList.tsx` | Add analytics button and modal |
| `src/components/ResumeLibrary.tsx` | Add edit content modal |
| `src/workspace/Workspace.tsx` | Add PDF button and gap analysis panel |
| `src/components/JobDetailDrawer.tsx` | Add PDF generation action |
| `src/i18n/locales/en.json` | Add new translation keys |
| `src/i18n/locales/zh.json` | Add new translation keys |

## New Components to Create

| File | Purpose |
|------|---------|
| `src/components/AnalyticsModal.tsx` | Analytics dashboard modal |
| `src/components/ResumeEditorModal.tsx` | Edit resume content |
| `src/components/PdfBuilder.tsx` | PDF generation with templates |
| `src/components/GapAnalysisPanel.tsx` | Display skill gaps |

---

## Dependencies

No additional dependencies required. Uses:
- Existing `@tanstack/react-query` for data fetching
- Existing `lucide-react` for icons
- Existing `@base-ui/react` for UI components
- Existing `@milkdown/react` for editor
- Simple CSS bar charts (no chart library needed)

PDF rendering uses browser capabilities (`window.print` or HTML-to-PDF blob generation) and does not rely on backend rendering.

---

## Testing & Verification

1. **PDF Generation**
   - Select template and generate PDF from Workspace
   - Verify PDF downloads correctly
   - Test with different templates

2. **Analytics Modal**
   - Open from Jobs list
   - Verify funnel metrics display correctly
   - Test period selector (week/month/all)
   - Verify skill insights appear

3. **Resume Edit**
   - Open editor from Resume Library
   - Edit content and save
   - Verify changes persist

4. **Gap Analysis**
   - View gap analysis panel in Workspace
   - Verify strengths/gaps/suggestions display
   - Check color coding (green/yellow/blue)

5. **Error Handling**
   - Test when Eve backend is offline
   - Verify loading states
   - Check error messages

---

## Estimated Effort

- Phase 4.1 (API): ~1 hour
- Phase 4.2 (Core Components): ~2 hours
- Phase 4.3 (Modals): ~2 hours
- Phase 4.4 (Integration): ~1 hour
- Phase 4.5 (i18n): ~30 min
- **Total: ~6.5 hours**
