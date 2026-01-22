import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  Star,
  MoreVertical,
  FileCode,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { eveApi, type Resume } from "@/lib/api";
import { ResumeEditorModal } from "@/components/ResumeEditorModal";

export function ResumeLibrary() {
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportingMode] = useState<"markdown" | "pdf" | null>(
    null,
  );
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editingResume, setEditingResume] = useState<Resume | null>(null);

  const { data: resumesData, isLoading } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => eveApi.getResumes(),
  });

  const importMutation = useMutation({
    mutationFn: (data: {
      name: string;
      content: string;
      format: "markdown" | "pdf";
    }) => eveApi.createResume(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      resetImport();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => eveApi.deleteResume(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => eveApi.setDefaultResume(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });

  const resetImport = () => {
    setIsImporting(false);
    setImportingMode(null);
    setNewName("");
    setNewContent("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result;
      if (typeof result !== "string") return;

      const base64 = result.split(",")[1];
      if (!base64) return;

      setNewName(file.name.replace(/\.[^/.]+$/, ""));
      setNewContent(base64);
      setImportingMode("pdf");
    };
    reader.readAsDataURL(file);
  };

  const handleImport = () => {
    if (!newName || !newContent || !importMode) return;
    importMutation.mutate({
      name: newName,
      content: newContent,
      format: importMode,
    });
  };

  const resumes = resumesData?.resumes || [];

  if (isImporting) {
    return (
      <div className="h-full flex flex-col p-4 bg-background animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold tracking-tight">Import Resume</h2>
          <Button variant="ghost" size="sm" onClick={resetImport}>
            Cancel
          </Button>
        </div>

        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          <div className="space-y-2">
            <label className="text-sm font-medium">Resume Name</label>
            <Input
              placeholder="e.g. Senior Software Engineer 2024"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>

          {!importMode ? (
            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button
                variant="outline"
                className="h-32 flex flex-col gap-2 rounded-2xl border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all"
                onClick={() => setImportingMode("markdown")}
              >
                <FileCode className="h-8 w-8 text-primary" />
                <span>Paste Markdown</span>
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  className="h-32 w-full flex flex-col gap-2 rounded-2xl border-dashed border-2"
                >
                  <Upload className="h-8 w-8 text-primary" />
                  <span>Upload PDF</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {importMode === "pdf"
                    ? "PDF Attached"
                    : "Resume Content (Markdown)"}
                </span>
                {importMode === "pdf" && (
                  <Badge
                    variant="secondary"
                    className="bg-primary/5 text-primary border-primary/10"
                  >
                    {newName}.pdf
                  </Badge>
                )}
              </div>

              {importMode === "markdown" ? (
                <Textarea
                  placeholder="# Your Name\n\nExperience..."
                  className="flex-1 font-mono text-xs resize-none min-h-50"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-muted/20 rounded-xl border border-dashed border-border min-h-50">
                  <FileText className="h-12 w-12 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    PDF file ready for parsing
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4"
                    onClick={() => setImportingMode(null)}
                  >
                    Change File
                  </Button>
                </div>
              )}

              <Button
                className="w-full h-11 rounded-xl shadow-lg shadow-primary/20 mt-auto"
                disabled={importMutation.isPending || !newContent || !newName}
                onClick={handleImport}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                    Importing...
                  </>
                ) : (
                  "Import into Library"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-muted/5">
      <div className="p-4 border-b border-border/40 flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h2 className="text-sm font-bold tracking-tight">Resume Library</h2>
          <p className="text-[10px] text-muted-foreground">
            {resumes.length} versions stored
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg px-2"
            onClick={() =>
              window.open(
                window.location.href.split("#")[0] + "#/workspace",
                "_blank",
              )
            }
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            className="h-8 rounded-lg px-3"
            onClick={() => setIsImporting(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Import
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {isLoading ? (
          <div className="h-[50vh] flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin opacity-20" />
          </div>
        ) : resumes.length === 0 ? (
          <div className="h-[50vh] flex flex-col items-center justify-center text-center text-muted-foreground space-y-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center border border-border/50">
              <FileText className="h-8 w-8 opacity-40" />
            </div>
            <div>
              <p className="font-medium text-foreground/80">No resumes yet</p>
              <p className="text-xs max-w-[200px] mt-1">
                Import your resume to start analyzing jobs and tailoring
                applications.
              </p>
            </div>
          </div>
        ) : (
          resumes.map((resume) => (
            <Card
              key={resume.id}
              className={`group transition-all duration-300 border-border/40 hover:border-primary/30 bg-card/50 backdrop-blur-sm overflow-hidden ${resume.isDefault ? "ring-1 ring-primary/20 shadow-md shadow-primary/5" : ""}`}
            >
              <CardContent className="p-3 relative">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${resume.isDefault ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground"}`}
                    >
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                          {resume.name}
                        </h3>
                        {resume.isDefault ? (
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 shrink-0" />
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="capitalize">
                          {resume.source.replace("_", " ")}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(resume.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-40 rounded-xl"
                    >
                      {!resume.isDefault && (
                        <DropdownMenuItem
                          className="text-xs py-2 rounded-lg"
                          onClick={() => setDefaultMutation.mutate(resume.id)}
                        >
                          <Star className="h-3.5 w-3.5 mr-2" />
                          Set as Default
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-xs py-2 rounded-lg"
                        onClick={() => setEditingResume(resume)}
                      >
                        <FileCode className="h-3.5 w-3.5 mr-2" />
                        Edit Content
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        className="text-xs py-2 rounded-lg"
                        onClick={() => deleteMutation.mutate(resume.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {resume.parseStatus !== "success" && (
                  <div className="mt-3 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10 flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-yellow-600" />
                    <span className="text-[10px] font-medium text-yellow-700 uppercase">
                      {resume.parseStatus} Parsing
                    </span>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between text-[10px] font-medium pt-3 border-t border-border/30">
                  <span className="text-muted-foreground">
                    Used {resume.useCount} times
                  </span>
                  <div className="flex items-center gap-2">
                    {resume.isDefault && (
                      <Badge
                        variant="secondary"
                        className="h-5 text-[9px] bg-primary/5 text-primary border-primary/10 px-1.5"
                      >
                        DEFAULT
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {editingResume && (
        <ResumeEditorModal
          open={!!editingResume}
          resume={editingResume}
          onClose={() => setEditingResume(null)}
        />
      )}
    </div>
  );
}
