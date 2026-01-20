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
