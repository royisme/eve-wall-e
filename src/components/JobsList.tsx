import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink, Building2, MapPin, Clock, Briefcase, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

type JobStatus = "inbox" | "applied" | "interviewing" | "offer" | "rejected";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  status: JobStatus;
  addedAt: Date;
  url?: string;
}

const getStatusConfig = (t: any) => ({
  inbox: { label: t('jobs.status.inbox'), variant: "secondary" as const, className: "bg-muted text-muted-foreground border-border" },
  applied: { label: t('jobs.status.applied'), variant: "default" as const, className: "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20" },
  interviewing: { label: t('jobs.status.interviewing'), variant: "outline" as const, className: "bg-accent/10 text-accent border-accent/20" },
  offer: { label: t('jobs.status.offer'), variant: "default" as const, className: "bg-green-500/15 text-green-600 border-green-500/20 hover:bg-green-500/25" },
  rejected: { label: t('jobs.status.rejected'), variant: "destructive" as const, className: "bg-destructive/10 text-destructive border-destructive/20" },
});

const mockJobs: Job[] = [
  { id: "1", title: "Senior Software Engineer", company: "Google", location: "Mountain View, CA", status: "inbox", addedAt: new Date(), url: "https://careers.google.com" },
  { id: "2", title: "Staff Engineer", company: "Meta", location: "Menlo Park, CA", status: "applied", addedAt: new Date(Date.now() - 86400000) },
  { id: "3", title: "Principal Engineer", company: "Apple", location: "Cupertino, CA", status: "interviewing", addedAt: new Date(Date.now() - 172800000) },
];

export function JobsList() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  
  const statusConfig = getStatusConfig(t);

  const filteredJobs = mockJobs.filter((job) => {
    const matchesText = job.title.toLowerCase().includes(filter.toLowerCase()) ||
      job.company.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesText && matchesStatus;
  });

  const formatDate = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return t('jobs.time.today');
    if (days === 1) return t('jobs.time.yesterday');
    return t('jobs.time.daysAgo', { count: days });
  };

  return (
    <div className="h-full flex flex-col bg-muted/5">
      <div className="p-4 border-b border-border/40 space-y-3 bg-background/80 backdrop-blur-md sticky top-0 z-10 transition-all">
        <div className="relative group">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
          <Input
            placeholder={t('jobs.searchPlaceholder')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9 bg-muted/40 border-transparent focus:border-primary/30 focus:bg-background transition-all duration-300 rounded-xl"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mask-linear-fade">
          {(["all", "inbox", "applied", "interviewing"] as const).map((status) => (
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
              {status === "all" ? t('jobs.status.all') : statusConfig[status].label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {filteredJobs.length === 0 ? (
          <div className="h-[50vh] flex flex-col items-center justify-center text-center text-muted-foreground space-y-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center border border-border/50">
              <Briefcase className="h-8 w-8 opacity-40" />
            </div>
            <p className="font-medium">{t('jobs.noResults')}</p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <Card 
              key={job.id} 
              className="cursor-pointer group relative overflow-hidden transition-all duration-300 border-border/40 hover:border-primary/30 hover:shadow-[0_4px_20px_-12px_rgba(96,165,250,0.3)] bg-card/50 backdrop-blur-sm"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <CardHeader className="p-3 pb-2 relative">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors duration-300">
                    {job.title}
                  </CardTitle>
                  <Badge 
                    variant="outline"
                    className={`text-[10px] px-2 py-0.5 shrink-0 uppercase tracking-wider font-mono border ${statusConfig[job.status].className}`}
                  >
                    {statusConfig[job.status].label}
                  </Badge>
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
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30 group-hover:border-primary/10 transition-colors">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/80">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(job.addedAt)}</span>
                    </div>
                    {job.url && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                         <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 hover:bg-primary/10 hover:text-primary rounded-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle analyze logic here or emit event
                          }}
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          {t('jobContext.analyze')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 hover:bg-muted rounded-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(job.url, "_blank");
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
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
