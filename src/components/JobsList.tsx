import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink, Building2, MapPin, Clock, Briefcase, Zap, RefreshCw, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eveApi, type Job, type JobStatus } from "@/lib/api";
import { JobDetailDrawer } from "@/components/JobDetailDrawer";

const getStatusConfig = (t: any) => ({
  inbox: { label: t('jobs.status.inbox'), variant: "secondary" as const, className: "bg-muted text-muted-foreground border-border" },
  applied: { label: t('jobs.status.applied'), variant: "default" as const, className: "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20" },
  interviewing: { label: t('jobs.status.interviewing'), variant: "outline" as const, className: "bg-accent/10 text-accent border-accent/20" },
  offer: { label: t('jobs.status.offer'), variant: "default" as const, className: "bg-green-500/15 text-green-600 border-green-500/20 hover:bg-green-500/25" },
  rejected: { label: t('jobs.status.rejected'), variant: "destructive" as const, className: "bg-destructive/10 text-destructive border-destructive/20" },
  skipped: { label: t('jobs.status.skipped'), variant: "outline" as const, className: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
});

export function JobsList() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ syncing: boolean; message: string }>({ 
    syncing: false, 
    message: "" 
  });
  
  const statusConfig = getStatusConfig(t);

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ["jobs", statusFilter, filter],
    queryFn: () => eveApi.getJobs({ 
      status: statusFilter === "all" ? undefined : statusFilter,
      search: filter || undefined 
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ["job-stats"],
    queryFn: () => eveApi.getJobStats(),
  });

  const starMutation = useMutation({
    mutationFn: ({ id, starred }: { id: number; starred: boolean }) => eveApi.starJob(id, starred),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: JobStatus }) => eveApi.updateJob(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job-stats"] });
    },
  });

  const handleSync = async () => {
    setSyncStatus({ syncing: true, message: "Initializing sync..." });
    try {
      await eveApi.syncJobs((synced, total) => {
        setSyncStatus({ syncing: true, message: `Synced ${synced}/${total}` });
      });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job-stats"] });
      setSyncStatus({ syncing: false, message: "" });
    } catch (error) {
      console.error("Sync failed:", error);
      setSyncStatus({ syncing: false, message: "" });
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const diff = Date.now() - date.getTime();
      const days = Math.floor(diff / 86400000);
      if (days === 0) return t('jobs.time.today');
      if (days === 1) return t('jobs.time.yesterday');
      return t('jobs.time.daysAgo', { count: days });
    } catch (e) {
      return "Unknown date";
    }
  };

  const jobs = jobsData?.jobs || [];

  if (selectedJobId) {
    return <JobDetailDrawer jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />;
  }

  return (
    <div className="h-full flex flex-col bg-muted/5">
      <div className="p-4 border-b border-border/40 space-y-3 bg-background/80 backdrop-blur-md sticky top-0 z-10 transition-all">
        <div className="flex items-center gap-2">
          <div className="relative group flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
            <Input
              placeholder={t('jobs.searchPlaceholder')}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 bg-muted/40 border-transparent focus:border-primary/30 focus:bg-background transition-all duration-300 rounded-xl"
            />
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            disabled={syncStatus.syncing}
            className="rounded-xl shrink-0 h-10 w-10"
            onClick={handleSync}
          >
            <RefreshCw className={`h-4 w-4 ${syncStatus.syncing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {syncStatus.syncing && (
          <div className="px-1 text-[10px] text-primary font-medium animate-pulse">
            {syncStatus.message}
          </div>
        )}

        {stats && (
          <div className="flex gap-4 px-1 py-1 text-[10px] font-medium text-muted-foreground overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span>Inbox: {stats.inbox}</span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Applied: {stats.applied}</span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <div className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span>Interview: {stats.interviewing}</span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span>Offers: {stats.offer}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mask-linear-fade">
          { (["all", "inbox", "applied", "interviewing"] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              className={`
                h-7 text-xs rounded-lg px-3 transition-all duration-300 border
                ${statusFilter === status 
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 border-primary" 
                  : "bg-transparent border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"}
              `}
              onClick={() => setStatusFilter(status)}
            >
              {status === "all" ? t('jobs.status.all') : (statusConfig as any)[status]?.label || status}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {isLoading ? (
          <div className="h-[50vh] flex items-center justify-center">
            <RefreshCw className="h-8 w-8 text-primary animate-spin opacity-20" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="h-[50vh] flex flex-col items-center justify-center text-center text-muted-foreground space-y-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center border border-border/50">
              <Briefcase className="h-8 w-8 opacity-40" />
            </div>
            <p className="font-medium">{t('jobs.noResults')}</p>
          </div>
        ) : (
          jobs.map((job) => (
            <Card 
              key={job.id} 
              className="cursor-pointer group relative overflow-hidden transition-all duration-300 border-border/40 hover:border-primary/30 hover:shadow-[0_4px_20px_-12px_rgba(96,165,250,0.3)] bg-card/50 backdrop-blur-sm"
              onClick={() => setSelectedJobId(job.id)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <CardHeader className="p-3 pb-2 relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors duration-300 truncate">
                      {job.title}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    {job.matchScore && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-primary/5 text-primary border-primary/10">
                        {job.matchScore}% Match
                      </Badge>
                    )}
                    <Badge 
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 shrink-0 uppercase tracking-wider font-mono border ${(statusConfig as any)[job.status]?.className || ''}`}
                    >
                      {(statusConfig as any)[job.status]?.label || job.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 relative">
                <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3 w-3 opacity-70" />
                    <span className="font-medium text-foreground/80">{job.company}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 opacity-70" />
                    <span className="truncate">{job.location}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30 group-hover:border-primary/10 transition-colors">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/80">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(job.createdAt)}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 opacity-0 group-hover:opacity-100 hover:bg-slate-500/10 hover:text-slate-500 rounded-md transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatusMutation.mutate({ id: job.id, status: "skipped" });
                        }}
                      >
                        Skip
                      </Button>
                       <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 w-6 p-0 rounded-md transition-all ${job.starred ? 'text-yellow-500 bg-yellow-500/10' : 'opacity-0 group-hover:opacity-100 hover:bg-muted'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          starMutation.mutate({ id: job.id, starred: !job.starred });
                        }}
                      >
                        <Star className={`h-3 w-3 ${job.starred ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 opacity-0 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary rounded-md transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJobId(job.id);
                        }}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        {t('jobContext.analyze')}
                      </Button>
                      {job.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-muted rounded-md transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(job.url, "_blank");
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
