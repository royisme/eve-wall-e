import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { X, Save, Loader2, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
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
              disabled={!isDirty && name === resume.name || updateMutation.isPending}
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
