import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import ActionButtons from "./ActionButtons";
import PendingImages from "./PendingImages";

interface PendingImage {
  id: string;
  file: File;
  preview: string;
}

interface InputAreaProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  pendingImages: PendingImage[];
  isRecording: boolean;
  isLoading: boolean;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onImageUpload: (files: FileList) => void;
  onRemovePendingImage: (imageId: string) => void;
  onVoiceRecording: () => void;
  onStartCamera: () => void;
}

const InputArea = ({
  inputValue,
  setInputValue,
  pendingImages,
  isRecording,
  isLoading,
  onSendMessage,
  onKeyPress,
  onImageUpload,
  onRemovePendingImage,
  onVoiceRecording,
  onStartCamera
}: InputAreaProps) => {
  return (
    <div className="p-4 space-y-4">
      {/* Pending Images Preview */}
      <PendingImages 
        pendingImages={pendingImages}
        onRemoveImage={onRemovePendingImage}
      />

      {/* Message input with action buttons */}
      <div className="flex gap-2 items-center">
        {/* Action buttons to the left */}
        <ActionButtons
          isRecording={isRecording}
          isLoading={isLoading}
          onImageUpload={onImageUpload}
          onVoiceRecording={onVoiceRecording}
          onStartCamera={onStartCamera}
        />

        {/* Text input */}
        <div className="flex-1 relative">
          <Input 
            value={inputValue} 
            onChange={e => setInputValue(e.target.value)} 
            onKeyPress={onKeyPress} 
            placeholder="Skriv ditt meddelande här..." 
            className="pl-6 pr-14 py-6 bg-muted border-0 rounded-full text-base focus:ring-2 focus:ring-primary/20 min-h-[56px]" 
            disabled={isLoading} 
          />
          
          {/* Send button to the right */}
          <Button 
            size="sm" 
            variant="ghost" 
            className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 p-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90" 
            onClick={onSendMessage} 
            disabled={!inputValue.trim() && pendingImages.length === 0 || isLoading}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InputArea;