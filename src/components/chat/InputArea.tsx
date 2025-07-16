import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
    <div className="p-3 space-y-3">
      {/* Pending Images Preview */}
      <PendingImages 
        pendingImages={pendingImages}
        onRemoveImage={onRemovePendingImage}
      />

      {/* Action buttons above textarea */}
      <div className="flex justify-center">
        <ActionButtons
          isRecording={isRecording}
          isLoading={isLoading}
          onImageUpload={onImageUpload}
          onVoiceRecording={onVoiceRecording}
          onStartCamera={onStartCamera}
        />
      </div>

      {/* Message input with send button */}
      <div className="flex gap-2 items-end">
        {/* Text input */}
        <div className="flex-1 relative">
          <Textarea 
            value={inputValue} 
            onChange={e => setInputValue(e.target.value)} 
            onKeyPress={onKeyPress} 
            placeholder="Skriv ditt meddelande här..." 
            className="pl-4 pr-14 py-3 bg-muted border-0 rounded-2xl text-base focus:ring-2 focus:ring-primary/20 min-h-[80px] resize-none"
            disabled={isLoading}
            rows={2}
            style={{ fontSize: '16px' }} // Prevents zoom on iOS
          />
          
          {/* Send button to the right */}
          <Button 
            size="sm" 
            variant="ghost" 
            className="absolute right-1 bottom-1 h-10 w-10 p-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-transform" 
            onClick={onSendMessage} 
            disabled={!inputValue.trim() && pendingImages.length === 0 || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InputArea;