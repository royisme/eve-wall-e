import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Wand2,
  Briefcase,
  Save,
  History,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { eveApi } from "@/lib/api";
import { MilkdownEditor } from "@/components/MilkdownEditor";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PdfBuilder } from "@/components/PdfBuilder";
import { GapAnalysisPanel } from "@/components/GapAnalysisPanel";
import { OfflineBanner } from "@/components/OfflineBanner";

export function Workspace() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const jobIdParam = searchParams.get("jobId");
  const jobId = jobIdParam ? parseInt(jobIdParam) : null;

  const [activeVersionId, setActiveVersionId] = useState<string>("latest");
  const [content, setContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // 1. Fetch Job Details
  const { data: jobData, isLoading: isLoadingJob } = useQuery({
    queryKey: ["job-detail", jobId],
    queryFn: () => jobId ? eveApi.getJobDetail(jobId) : null,
    enabled: !!jobId,
  });

  // 2. Fetch Tailored Versions
  const { data: versionsData, isLoading: isLoadingVersions } = useQuery({
    queryKey: ["tailored-versions", jobId],
    queryFn: () => jobId ? eveApi.getTailoredVersions(jobId) : null,
    enabled: !!jobId,
  });

  // Effect: Set initial content when data loads
  useEffect(() => {
    if (versionsData?.versions && versionsData.versions.length > 0) {
      // Find the version to display
      const version = activeVersionId === "latest" 
        ? versionsData.versions.find(v => v.isNew) || versionsData.versions[0]
        : versionsData.versions.find(v => v.id.toString() === activeVersionId);
      
      if (version) {
        setContent(version.content);
        // If we switched to "latest" explicitly, update the ID ref
        if (activeVersionId === "latest") {
          setActiveVersionId(version.id.toString());
        }
      }
    }
  }, [versionsData, activeVersionId]);

  // Handle content change
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setIsDirty(true);
  };

  // 3. Save Mutation
  const saveMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) => 
      eveApi.updateTailoredResume(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tailored-versions", jobId] });
      setIsDirty(false);
    },
  });

  // 4. Tailor/Regenerate Mutation
  const tailorMutation = useMutation({
    mutationFn: (forceNew: boolean) => {
      if (!jobId) throw new Error("No Job ID");
      // Use default resume for now, or allow selection
      return eveApi.tailorResume(jobId, jobData?.analysis?.resumeId || 0, forceNew);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tailored-versions", jobId] });
      setActiveVersionId(data.id.toString());
      setContent(data.content);
    },
  });

  if (!jobId) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
          <h2 className="text-lg font-semibold">No Job Selected</h2>
          <p className="text-sm text-muted-foreground">Please select a job from the Jobs tab to start tailoring.</p>
          <Button onClick={() => window.close()}>Close Workspace</Button>
        </div>
      </div>
    );
  }

  if (isLoadingJob || isLoadingVersions) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const job = jobData?.job;
  const versions = versionsData?.versions || [];
  const currentVersion = versions.find(v => v.id.toString() === activeVersionId);

  return (
    <div className="h-dvh w-full flex flex-col bg-background/95 backdrop-blur-sm">
      <OfflineBanner />
      {/* Header */}
      <header className="h-14 border-b border-border/40 flex items-center px-4 justify-between bg-background/80 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="font-bold text-sm leading-tight truncate max-w-[300px]">{job?.title}</h1>
            <span className="text-xs text-muted-foreground truncate max-w-[300px]">{job?.company}</span>
          </div>
          <div className="h-6 w-px bg-border/60" />
          
          {/* Version Selector */}
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <Select value={activeVersionId} onValueChange={(val) => val && setActiveVersionId(val)}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id.toString()} className="text-xs">
                    v{v.version} - {new Date(v.createdAt).toLocaleDateString()} {v.isNew ? "(Latest)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs"
            onClick={() => tailorMutation.mutate(true)}
            disabled={tailorMutation.isPending}
          >
            {tailorMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-2" />}
            New Version
          </Button>
          
          <Button 
            size="sm" 
            className="h-8 text-xs"
            disabled={!isDirty || saveMutation.isPending}
            onClick={() => currentVersion && saveMutation.mutate({ id: currentVersion.id, content })}
          >
            {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-2" />}
            Save Changes
          </Button>
        </div>
      </header>
      
      {/* Main Content - Split View */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* Left: Job Description */}
        <div className="h-full flex flex-col border-r border-border/40 bg-muted/5 min-w-0">
          <div className="px-4 py-2 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job Description</span>
            </div>
            {job?.status && <Badge variant="outline" className="text-[10px] h-5">{job.status}</Badge>}
          </div>
          <div className="flex-1 overflow-y-auto p-6 prose prose-sm max-w-none dark:prose-invert">
             <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
               {job?.jdMarkdown || "No description available."}
             </div>
          </div>
          {jobData?.analysis && (
            <div className="p-4 border-t border-border/40 overflow-y-auto max-h-[40%]">
              <GapAnalysisPanel analysis={jobData.analysis} matchScore={jobData.analysis.overallScore} />
            </div>
          )}
        </div>
        
        {/* Right: Resume Editor */}
        <div className="h-full flex flex-col min-w-0 bg-background">
          <div className="px-4 py-2 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Tailored Resume (Markdown)</span>
            </div>
            {isDirty && <span className="text-[10px] text-yellow-600 font-medium animate-pulse">● Unsaved changes</span>}
          </div>
          
          {/* Suggestions Panel (Collapsible or Top Banner) */}
          {currentVersion?.suggestions && currentVersion.suggestions.length > 0 && (
            <div className="bg-primary/5 border-b border-primary/10 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-bold text-primary">AI Suggestions</span>
              </div>
              <ul className="space-y-1">
                {currentVersion.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            <ErrorBoundary
              fallback={
                <Textarea
                  className="flex-1 h-full font-mono text-sm resize-none border-0 focus-visible:ring-0 p-6 leading-relaxed bg-transparent selection:bg-primary/20 scrollbar-thin rounded-none"
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Tailored resume content will appear here..."
                  spellCheck={false}
                />
              }
            >
              <MilkdownEditor
                className="h-full"
                initialValue={content}
                onChange={handleContentChange}
              />
            </ErrorBoundary>
          </div>

          <div className="p-4 border-t border-border/40 bg-muted/5">
            <PdfBuilder
              markdown={content}
              filename={`${job?.title}-${job?.company}`}
              tailoredResumeId={currentVersion?.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
