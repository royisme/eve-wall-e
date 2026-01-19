import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { Settings as SettingsIcon, Server, Globe } from "lucide-react";

interface SettingsProps {
  onSave: () => void;
}

export function Settings({ onSave }: SettingsProps) {
  const { t, i18n } = useTranslation();
  const [port, setPort] = useState("3033");
  const [status, setStatus] = useState("");
  const [language, setLanguage] = useState(i18n.language);

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["serverPort", "language"], (result: { serverPort?: string; language?: string }) => {
        if (result.serverPort) {
          setPort(result.serverPort);
        }
        if (result.language) {
          setLanguage(result.language);
          i18n.changeLanguage(result.language);
        }
      });
    }
  }, [i18n]);

  const handleSave = () => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.set({ serverPort: port, language }, () => {
        i18n.changeLanguage(language);
        setStatus(t('settings.saved'));
        setTimeout(() => setStatus(""), 2000);
        onSave();
      });
    } else {
      console.warn("Chrome storage API not available");
      i18n.changeLanguage(language);
      setStatus(t('settings.saved')); // Fallback
      onSave();
    }
  };

  return (
    <div className="p-6 w-full h-full flex items-center justify-center bg-muted/10">
      <Card className="w-full max-w-sm shadow-xl border-border/40 bg-background/80 backdrop-blur-xl animate-in zoom-in-95 duration-300">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2 text-primary ring-1 ring-primary/20">
            <SettingsIcon className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl tracking-tight">{t('settings.title')}</CardTitle>
          <CardDescription>{t('settings.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <div className="space-y-2.5">
            <Label htmlFor="language" className="flex items-center gap-2 text-muted-foreground">
              <Globe className="h-4 w-4" />
              {t('settings.language')}
            </Label>
            <Select value={language} onValueChange={(val) => setLanguage(val || 'en')}>
              <SelectTrigger id="language" className="bg-muted/30 border-border/50 focus:ring-primary/20">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('settings.languages.en')}</SelectItem>
                <SelectItem value="zh">{t('settings.languages.zh')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="port" className="flex items-center gap-2 text-muted-foreground">
              <Server className="h-4 w-4" />
              {t('settings.serverPort')}
            </Label>
            <Input
              id="port"
              type="number"
              placeholder="3033"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="bg-muted/30 border-border/50 focus:ring-primary/20 font-mono"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-3 pt-2">
          <Button onClick={handleSave} className="w-full h-10 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02]">
            {t('common.save')}
          </Button>
          {status && (
            <div className="w-full p-2.5 bg-green-500/10 border border-green-500/20 text-green-600 rounded-lg text-sm text-center font-medium animate-in fade-in slide-in-from-top-2">
              {status}
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
