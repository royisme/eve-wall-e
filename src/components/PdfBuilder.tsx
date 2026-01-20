import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FileText, Download, Loader2, CheckCircle, Sparkles, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { eveApi, type PdfTemplate } from "@/lib/api";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface PdfBuilderProps {
  markdown: string;
  filename?: string;
  tailoredResumeId?: number;
  onComplete?: () => void;
}

// Simple markdown to HTML conversion for PDF
function markdownToHtml(markdown: string, template: PdfTemplate): string {
  // Convert markdown to HTML (simple version)
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-3">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br/>');

  // Wrap in template-specific styles
  const baseStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    h1, h2, h3 { color: #0f172a; margin-top: 1.5em; }
    h1 { font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
    h2 { font-size: 20px; }
    h3 { font-size: 18px; color: #3b82f6; }
    strong { font-weight: 600; }
    li { margin-bottom: 4px; }
  `;

  const templateStyles: Record<PdfTemplate, string> = {
    modern: `
      ${baseStyles}
      body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
      .page {
        background: white;
        padding: 50px;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      }
    `,
    classic: `
      ${baseStyles}
      body { background: #f5f5f5; }
      .page {
        background: white;
        padding: 60px;
        border: 1px solid #d1d5db;
      }
      h1 { color: #1e40af; font-weight: 700; }
      h2 { color: #3b82f6; font-weight: 600; }
      h3 { color: #6366f1; }
    `,
    minimal: `
      ${baseStyles}
      body { background: #ffffff; }
      .page { padding: 40px; }
      h1 { border-bottom: none; font-weight: 400; letter-spacing: -0.5px; }
      h2 { font-weight: 400; }
      h3 { color: #64748b; }
    `,
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Resume</title>
  <style>${templateStyles[template]}</style>
</head>
<body>
  <div class="page">
    <p>${html}</p>
  </div>
</body>
</html>`;
}

async function generatePdfBlob(markdown: string, template: PdfTemplate): Promise<Blob> {
  const html = markdownToHtml(markdown, template);

  // Create a temporary element to render HTML
  // Note: markdown content is from user's editor or backend, trusted source
  const container = document.createElement("div");
  container.innerHTML = html;
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.width = "800px";
  container.style.background = "white";
  document.body.appendChild(container);

  try {
    // Convert to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    // Create PDF (A4 size)
    const pdf = new jsPDF("p", "mm", "a4");
    const imgData = canvas.toDataURL("image/png");

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageHeight = 297; // A4 height in mm

    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf.output("blob");
  } finally {
    document.body.removeChild(container);
  }
}

export function PdfBuilder({ markdown, filename = "resume", tailoredResumeId, onComplete }: PdfBuilderProps) {
  const { t } = useTranslation();
  const [template, setTemplate] = useState<PdfTemplate>("modern");
  const [autoUpload, setAutoUpload] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const blob = await generatePdfBlob(markdown, template);
      if (autoUpload && tailoredResumeId) {
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

  const templates: { value: PdfTemplate; label: string; icon: string; description: string }[] = [
    { value: "modern", label: t('pdf.templates.modern'), icon: "✨", description: "Gradient header" },
    { value: "classic", label: t('pdf.templates.classic'), icon: "📄", description: "Traditional style" },
    { value: "minimal", label: t('pdf.templates.minimal'), icon: "◽", description: "Clean & simple" },
  ];

  const selectedTemplate = templates.find(tpl => tpl.value === template);

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
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{t('pdf.buildDescription')}</p>
              <p className="text-[10px] text-muted-foreground/70">({selectedTemplate?.description})</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {tailoredResumeId && (
              <Button
                variant="ghost"
                size="sm"
                className={autoUpload ? "bg-primary/10" : ""}
                onClick={() => setAutoUpload(!autoUpload)}
                title={autoUpload ? "Disable auto-upload" : "Enable auto-upload to Eve"}
              >
                <UploadCloud className="h-3.5 w-3.5" />
              </Button>
            )}

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
        </div>
      </CardContent>
    </Card>
  );
}
