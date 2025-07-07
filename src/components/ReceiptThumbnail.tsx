import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileImage, Eye, Download } from "lucide-react";
import { ImageStorageService } from "@/lib/imageStorage";
import ReceiptImageViewer from "./ReceiptImageViewer";

interface ReceiptThumbnailProps {
  imagePath?: string;
  thumbnailPath?: string;
  metadata?: {
    originalName: string;
    size: number;
    type: string;
    width?: number;
    height?: number;
    uploadedAt: string;
  };
  analysis?: {
    type: 'receipt' | 'invoice' | 'bank_statement';
    amount?: number;
    vendor?: string;
    date?: string;
    description?: string;
  };
  compact?: boolean;
  showActions?: boolean;
}

const ReceiptThumbnail = ({ 
  imagePath, 
  thumbnailPath, 
  metadata, 
  analysis, 
  compact = false,
  showActions = true 
}: ReceiptThumbnailProps) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    loadThumbnail();
  }, [thumbnailPath, imagePath]);

  const loadThumbnail = async () => {
    const pathToLoad = thumbnailPath || imagePath;
    if (!pathToLoad) return;

    setLoading(true);
    try {
      const url = await ImageStorageService.getSignedUrl(pathToLoad);
      setThumbnailUrl(url);
    } catch (error) {
      console.error('Error loading thumbnail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!imagePath || !metadata) return;
    
    try {
      const url = await ImageStorageService.getSignedUrl(imagePath);
      const link = document.createElement('a');
      link.href = url;
      link.download = metadata.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  if (compact) {
    return (
      <>
        <div 
          className="relative group cursor-pointer"
          onClick={() => setViewerOpen(true)}
        >
          {loading && (
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          {!loading && thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt="Receipt thumbnail"
              className="w-16 h-16 object-cover rounded-lg border border-border/20 group-hover:border-primary/50 transition-colors"
            />
          )}
          
          {!loading && !thumbnailUrl && (
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
              <FileImage className="h-6 w-6 text-gray-400" />
            </div>
          )}
          
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
            <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          
          {analysis && (
            <Badge 
              variant="secondary" 
              className="absolute -top-1 -right-1 text-xs px-1 py-0 h-5"
            >
              {analysis.type === 'receipt' ? 'K' : 'F'}
            </Badge>
          )}
        </div>

        <ReceiptImageViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          imagePath={imagePath}
          thumbnailPath={thumbnailPath}
          metadata={metadata}
          analysis={analysis}
        />
      </>
    );
  }

  return (
    <>
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="space-y-3">
          {/* Thumbnail */}
          <div 
            className="relative group cursor-pointer"
            onClick={() => setViewerOpen(true)}
          >
            {loading && (
              <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 border-4 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            
            {!loading && thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt="Receipt thumbnail"
                className="w-full h-48 object-cover rounded-lg border border-border/20 group-hover:border-primary/50 transition-colors"
              />
            )}
            
            {!loading && !thumbnailUrl && (
              <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <FileImage className="h-12 w-12 text-gray-400" />
              </div>
            )}
            
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
              <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Analysis info */}
          {analysis && (
            <div className="space-y-2">
              <Badge variant="secondary">
                {analysis.type === 'receipt' ? 'Kvitto' : 
                 analysis.type === 'invoice' ? 'Faktura' : 'Kontoutdrag'}
              </Badge>
              
              {analysis.vendor && (
                <p className="text-sm font-medium truncate">{analysis.vendor}</p>
              )}
              
              {analysis.amount && (
                <p className="text-lg font-semibold">{analysis.amount} kr</p>
              )}
              
              {analysis.date && (
                <p className="text-xs text-muted-foreground">{analysis.date}</p>
              )}
            </div>
          )}

          {/* Metadata */}
          {metadata && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="truncate">{metadata.originalName}</p>
              <p>{new Date(metadata.uploadedAt).toLocaleDateString('sv-SE')}</p>
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1"
                onClick={() => setViewerOpen(true)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Visa
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      <ReceiptImageViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        imagePath={imagePath}
        thumbnailPath={thumbnailPath}
        metadata={metadata}
        analysis={analysis}
      />
    </>
  );
};

export default ReceiptThumbnail;