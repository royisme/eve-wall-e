import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  X,
  Star,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  Zap,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { eveApi, type JobStatus } from "@/lib/api";
import { PdfBuilder } from "@/components/PdfBuilder";

interface JobDetailDrawerProps {
  jobId: number;
  onClose: () => void;
}

const getStatusConfig = (t: any) => ({
  inbox: { label: t("jobs.status.inbox"), className: "bg-muted text-muted-foreground" },
  applied: { label: t("jobs.status.applied"), className: "bg-primary/20 text-primary" },
  interviewing: { label: t("jobs.status.interviewing"), className: "bg-accent/20 text-accent-foreground" },
  offer: { label: t("jobs.status.offer"), className: "bg-green-500/20 text-green-700 dark:text-green-400" },
  rejected: { label: t("jobs.status.rejected"), className: "bg-destructive/20 text-destructive" },
  skipped: { label: t("jobs.status.skipped"), className: "bg-slate-500/20 text-slate-600 dark:text-slate-400" },
});

export function JobDetailDrawer({ jobId, onClose }: JobDetailDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [showPdfBuilder, setShowPdfBuilder] = useState(false);
  const [tailoredResumeContent, setTailoredResumeContent] = useState<string>("");
  const statusConfig = getStatusConfig(t);

  const { data: resumesData } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => eveApi.getResumes(),
  });

  const defaultResume = resumesData?.resumes.find((r) => r.isDefault);
  const effectiveResumeId = selectedResumeId || defaultResume?.id;

  const { data: jobData, isLoading } = useQuery({
    queryKey: ["job-detail", jobId, effectiveResumeId],
    queryFn: () => eveApi.getJobDetail(jobId, { resumeId: effectiveResumeId }),
    enabled: !!effectiveResumeId,
  });

  const starMutation = useMutation({
    mutationFn: (starred: boolean) => eveApi.starJob(jobId, starred),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job-detail", jobId] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: JobStatus) => eveApi.updateJob(jobId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job-detail", jobId] });
      queryClient.invalidateQueries({ queryKey: ["job-stats"] });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: (forceRefresh: boolean) => {
      if (!effectiveResumeId) throw new Error("No resume selected");
      return eveApi.analyzeJob(jobId, effectiveResumeId, forceRefresh);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-detail", jobId] });
    },
  });

  const tailorMutation = useMutation({
    mutationFn: (forceNew: boolean) => {
      if (!effectiveResumeId) throw new Error("No resume selected");
      return eveApi.tailorResume(jobId, effectiveResumeId, forceNew);
    },
    onSuccess: (data) => {
      setTailoredResumeContent(data.content || "");
      queryClient.invalidateQueries({ queryKey: ["job-detail", jobId] });
    },
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!jobData) return null;

  const { job, analysis } = jobData;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-border/40 flex items-center justify-between bg-background sticky top-0 z-10">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          {t('jobDetail.back')}
        </Button>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={job.starred ? "text-yellow-500" : ""}
            onClick={() => starMutation.mutate(!job.starred)}
          >
            <Star className={`h-4 w-4 ${job.starred ? "fill-current" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h1 className="text-xl font-bold mb-1">{job.title}</h1>
          <p className="text-sm text-muted-foreground">
            {job.company} · {job.location}
          </p>
          {job.url && (
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto mt-1"
              onClick={() => window.open(job.url, "_blank")}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              {t('jobDetail.viewOriginal')}
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase">{t('jobDetail.resume')}</span>
              <Select
                value={String(effectiveResumeId || "")}
                onValueChange={(val) => setSelectedResumeId(Number(val))}
              >
                <SelectTrigger className="h-8 w-[200px]">
                  <SelectValue placeholder={t('jobDetail.selectResume')} />
                </SelectTrigger>
                <SelectContent>
                  {resumesData?.resumes.map((resume) => (
                    <SelectItem key={resume.id} value={String(resume.id)}>
                      {resume.name} {resume.isDefault && "⭐"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase">{t('jobDetail.status')}</span>
              <Select
                value={job.status}
                onValueChange={(val) => updateStatusMutation.mutate(val as JobStatus)}
              >
                <SelectTrigger className="h-8 w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(statusConfig) as JobStatus[]).map((status) => (
                    <SelectItem key={status} value={status}>
                      {(statusConfig as any)[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {effectiveResumeId && (
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {t('jobDetail.matchAnalysis')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  disabled={analyzeMutation.isPending}
                  onClick={() => analyzeMutation.mutate(analysis?.cached ? true : false)}
                >
                  {analyzeMutation.isPending ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Zap className="h-3 w-3 mr-1" />
                  )}
                  {analysis ? t('jobDetail.refresh') : t('jobDetail.analyze')}
                </Button>
              </div>

              {analyzeMutation.isPending && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t('jobDetail.analyzing')}
                </div>
              )}

              {analysis && !analyzeMutation.isPending && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold text-primary">{analysis.overallScore}%</div>
                    <div className="text-xs text-muted-foreground">
                      {analysis.cached && (
                        <Badge variant="secondary" className="text-[9px] bg-muted">
                          cached
                        </Badge>
                      )}
                    </div>
                  </div>

                  {analysis.strengths.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        {t('jobDetail.strengths')}
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-0.5 pl-4">
                        {analysis.strengths.map((s, i) => (
                          <li key={i} className="list-disc">
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.gaps.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs font-medium text-yellow-600">
                        <AlertCircle className="h-3 w-3" />
                        {t('jobDetail.gaps')}
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-0.5 pl-4">
                        {analysis.gaps.map((g, i) => (
                          <li key={i} className="list-disc">
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.suggestions.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs font-medium text-primary">
                        <Zap className="h-3 w-3" />
                        {t('jobDetail.suggestions')}
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-0.5 pl-4">
                        {analysis.suggestions.map((s, i) => (
                          <li key={i} className="list-disc">
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {!analysis && !analyzeMutation.isPending && (
                <div className="text-xs text-muted-foreground text-center py-4">
                  {t('jobDetail.clickAnalyze')}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {effectiveResumeId && analysis && (
          <Card>
            <CardContent className="p-3 space-y-2">
              <Button
                className="w-full"
                disabled={tailorMutation.isPending}
                onClick={() => tailorMutation.mutate(false)}
              >
                {tailorMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('jobDetail.tailoring')}
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    {t('jobDetail.tailorResume')}
                  </>
                )}
              </Button>
              {tailorMutation.isSuccess && tailoredResumeContent && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPdfBuilder(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {t('jobDetail.buildPdf')}
                </Button>
              )}
              {tailorMutation.isSuccess && (
                <div className="mt-2 text-xs text-green-600 text-center">
                  ✓ {t('jobDetail.tailoredSuccess')}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {showPdfBuilder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-background rounded-2xl p-4 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">{t('pdf.buildTitle')}</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowPdfBuilder(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <PdfBuilder
                markdown={tailoredResumeContent}
                filename={`${job.title}-${job.company}`}
                onComplete={() => setShowPdfBuilder(false)}
              />
              <p className="mt-4 text-[10px] text-muted-foreground text-center">
                {t('jobDetail.pdfNote')}
              </p>
            </div>
          </div>
        )}

        {job.jdMarkdown && (
          <Card>
            <CardContent className="p-3 space-y-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">
                {t('jobDetail.jobDescription')}
              </span>
              <div className="prose prose-sm max-w-none text-xs">
                <pre className="whitespace-pre-wrap font-sans text-xs">{job.jdMarkdown}</pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
