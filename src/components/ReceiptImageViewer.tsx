import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, RotateCw, Download, X } from "lucide-react";
import { ImageStorageService } from "@/lib/imageStorage";

interface ReceiptImageViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
}

const ReceiptImageViewer = ({ 
  open, 
  onOpenChange, 
  imagePath, 
  thumbnailPath, 
  metadata, 
  analysis 
}: ReceiptImageViewerProps) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadImage = async () => {
    if (!imagePath) return;
    
    setLoading(true);
    try {
      const url = await ImageStorageService.getSignedUrl(imagePath);
      setImageUrl(url);
    } catch (error) {
      console.error('Error loading image:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleDownload = async () => {
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

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Kvitto/Faktura</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleRotate}>
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-0 flex gap-6 h-[calc(95vh-120px)]">
          {/* Image Display */}
          <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            
            {!imageUrl && !loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button onClick={loadImage} variant="outline">
                  Ladda bild
                </Button>
              </div>
            )}

            {imageUrl && (
              <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                <img
                  src={imageUrl}
                  alt="Receipt/Invoice"
                  className="max-w-none transition-transform"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center'
                  }}
                />
              </div>
            )}
          </div>

          {/* Sidebar with metadata and analysis */}
          <div className="w-80 space-y-4 overflow-y-auto">
            {/* Analysis Results */}
            {analysis && (
              <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {analysis.type === 'receipt' ? 'Kvitto' : 
                     analysis.type === 'invoice' ? 'Faktura' : 'Kontoutdrag'}
                  </Badge>
                </div>
                
                {analysis.vendor && (
                  <div>
                    <span className="font-medium text-sm">Leverantör:</span>
                    <p className="text-sm">{analysis.vendor}</p>
                  </div>
                )}
                
                {analysis.amount && (
                  <div>
                    <span className="font-medium text-sm">Belopp:</span>
                    <p className="text-lg font-semibold">{analysis.amount} kr</p>
                  </div>
                )}
                
                {analysis.date && (
                  <div>
                    <span className="font-medium text-sm">Datum:</span>
                    <p className="text-sm">{analysis.date}</p>
                  </div>
                )}
                
                {analysis.description && (
                  <div>
                    <span className="font-medium text-sm">Beskrivning:</span>
                    <p className="text-sm">{analysis.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* Image Metadata */}
            {metadata && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <h3 className="font-medium text-sm">Bildinfo</h3>
                
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Filnamn:</span>
                    <span className="text-right">{metadata.originalName}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Storlek:</span>
                    <span>{formatFileSize(metadata.size)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Format:</span>
                    <span>{metadata.type.split('/')[1].toUpperCase()}</span>
                  </div>
                  
                  {metadata.width && metadata.height && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dimensioner:</span>
                      <span>{metadata.width} × {metadata.height}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uppladdad:</span>
                    <span>{new Date(metadata.uploadedAt).toLocaleDateString('sv-SE')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptImageViewer;