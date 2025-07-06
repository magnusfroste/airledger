import { Button } from "@/components/ui/button";
import { FileImage, X } from "lucide-react";

interface PendingImage {
  id: string;
  file: File;
  preview: string;
}

interface PendingImagesProps {
  pendingImages: PendingImage[];
  onRemoveImage: (imageId: string) => void;
}

const PendingImages = ({ pendingImages, onRemoveImage }: PendingImagesProps) => {
  if (pendingImages.length === 0) return null;

  return (
    <div className="bg-muted/30 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileImage className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground font-medium">
          Bifogade bilder ({pendingImages.length})
        </span>
      </div>
      <div className="flex gap-3 flex-wrap">
        {pendingImages.map(image => (
          <div key={image.id} className="relative group">
            <img 
              src={image.preview} 
              alt="Pending upload" 
              className="w-16 h-16 object-cover rounded-xl border border-border/20" 
            />
            <Button 
              size="sm" 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" 
              onClick={() => onRemoveImage(image.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingImages;