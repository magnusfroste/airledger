import { Button } from "@/components/ui/button";
import { Paperclip, Mic, MicOff, Camera } from "lucide-react";

interface ActionButtonsProps {
  isRecording: boolean;
  isLoading: boolean;
  onImageUpload: (files: FileList) => void;
  onVoiceRecording: () => void;
  onStartCamera: () => void;
}

const ActionButtons = ({ 
  isRecording, 
  isLoading, 
  onImageUpload, 
  onVoiceRecording, 
  onStartCamera 
}: ActionButtonsProps) => {
  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = e => {
      const files = (e.target as HTMLInputElement).files;
      if (files) onImageUpload(files);
    };
    input.click();
  };

  return (
    <div className="flex gap-1">
      <Button 
        variant={isRecording ? "destructive" : "ghost"} 
        size="sm" 
        onClick={onVoiceRecording} 
        className={`h-12 w-12 p-0 rounded-full ${isRecording ? 'animate-pulse bg-destructive text-destructive-foreground' : 'bg-green-500 hover:bg-green-600 text-white'}`} 
        disabled={isLoading} 
        title="Spela in röst"
      >
        {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-12 w-12 p-0 rounded-full bg-muted/50 hover:bg-muted/70" 
        onClick={handleFileUpload}
        disabled={isLoading} 
        title="Ladda upp bilder"
      >
        <Paperclip className="h-5 w-5" />
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-12 w-12 p-0 rounded-full bg-muted/50 hover:bg-muted/70" 
        onClick={onStartCamera} 
        disabled={isLoading} 
        title="Ta foto"
      >
        <Camera className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default ActionButtons;