import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Camera, Upload, FileImage, CheckCircle, AlertCircle, X, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  status: 'uploading' | 'analyzing' | 'completed' | 'error';
  analysis?: {
    type: 'receipt' | 'invoice' | 'bank_statement';
    amount?: number;
    vendor?: string;
    date?: string;
    description?: string;
    confidence: number;
  };
  progress: number;
}

const ImageUpload = () => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length !== fileArray.length) {
      toast({
        title: "Endast bilder tillåtna",
        description: "Vänligen välj endast bildfiler (JPG, PNG, etc.)",
        variant: "destructive",
      });
    }

    imageFiles.forEach(file => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const preview = URL.createObjectURL(file);
      
      const newImage: UploadedImage = {
        id,
        file,
        preview,
        status: 'uploading',
        progress: 0
      };

      setUploadedImages(prev => [...prev, newImage]);

      // Simulate upload and analysis process
      simulateImageProcessing(id);
    });
  }, [toast]);

  const simulateImageProcessing = (imageId: string) => {
    // Simulate upload progress
    const uploadInterval = setInterval(() => {
      setUploadedImages(prev => prev.map(img => {
        if (img.id === imageId && img.status === 'uploading') {
          const newProgress = img.progress + 10;
          if (newProgress >= 100) {
            clearInterval(uploadInterval);
            // Start analysis phase
            setTimeout(() => analyzeImage(imageId), 500);
            return { ...img, progress: 100, status: 'analyzing' };
          }
          return { ...img, progress: newProgress };
        }
        return img;
      }));
    }, 200);
  };

  const analyzeImage = (imageId: string) => {
    // Simulate AI analysis (will be replaced with OpenAI Vision API)
    setTimeout(() => {
      setUploadedImages(prev => prev.map(img => {
        if (img.id === imageId) {
          return {
            ...img,
            status: 'completed',
            analysis: {
              type: 'receipt',
              amount: 487.50,
              vendor: 'ICA Maxi Stockholm',
              date: '2024-01-03',
              description: 'Livsmedelsinköp',
              confidence: 0.95
            }
          };
        }
        return img;
      }));
    }, 2000);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeImage = (imageId: string) => {
    setUploadedImages(prev => {
      const image = prev.find(img => img.id === imageId);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== imageId);
    });
  };

  const capturePhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) handleFileSelect(files);
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Ladda upp dokument</h1>
              <p className="text-sm text-muted-foreground">Kvitton, fakturor & kontoutdrag</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container px-4 py-6 space-y-6">
        {/* Upload Area */}
        <Card className="border-border/50 bg-surface shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Ny uppladdning</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50 hover:bg-primary/5'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="space-y-4">
                <div className="flex justify-center">
                  <FileImage className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-foreground">
                    Dra och släpp bilder här
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Eller klicka för att välja filer från din enhet
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="professional"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.multiple = true;
                      input.onchange = (e) => {
                        const files = (e.target as HTMLInputElement).files;
                        if (files) handleFileSelect(files);
                      };
                      input.click();
                    }}
                  >
                    <Upload className="h-4 w-4" />
                    Välj filer
                  </Button>
                  
                  <Button variant="default" onClick={capturePhoto}>
                    <Camera className="h-4 w-4" />
                    Ta foto
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Stöder JPG, PNG och andra bildformat. Max 10MB per fil.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Uploaded Images */}
        {uploadedImages.length > 0 && (
          <Card className="border-border/50 bg-surface shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                Uppladdade dokument
                <Badge variant="outline">{uploadedImages.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {uploadedImages.map((image) => (
                <div key={image.id} className="border border-border/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-4">
                    <img
                      src={image.preview}
                      alt="Uploaded document"
                      className="w-16 h-16 object-cover rounded-md border border-border/50"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {image.file.name}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeImage(image.id)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {image.status === 'uploading' && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Laddar upp...</span>
                              <span className="text-xs text-foreground">{image.progress}%</span>
                            </div>
                            <Progress value={image.progress} className="h-1" />
                          </div>
                        )}
                        
                        {image.status === 'analyzing' && (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            <span className="text-xs text-muted-foreground">Analyserar med AI...</span>
                          </div>
                        )}
                        
                        {image.status === 'completed' && image.analysis && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-success" />
                              <span className="text-xs text-success font-medium">Analys klar</span>
                              <Badge variant="outline" className="text-xs">
                                {Math.round(image.analysis.confidence * 100)}% säkerhet
                              </Badge>
                            </div>
                            
                            <div className="bg-background rounded-md p-3 space-y-1">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Typ:</span>
                                  <span className="ml-2 font-medium">{image.analysis.type === 'receipt' ? 'Kvitto' : image.analysis.type}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Belopp:</span>
                                  <span className="ml-2 font-medium text-foreground">{image.analysis.amount} kr</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Leverantör:</span>
                                  <span className="ml-2 font-medium">{image.analysis.vendor}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Datum:</span>
                                  <span className="ml-2 font-medium">{image.analysis.date}</span>
                                </div>
                              </div>
                              <div className="pt-1">
                                <span className="text-muted-foreground text-xs">Beskrivning:</span>
                                <span className="ml-2 text-xs font-medium">{image.analysis.description}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {image.status === 'error' && (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <span className="text-xs text-destructive">Fel vid analys</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="border-border/50 bg-gradient-surface shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-foreground">AI-driven dokumentanalys</h3>
                <p className="text-sm text-muted-foreground">
                  Våra AI-system kommer att analysera dina dokument automatiskt med OpenAI Vision API för att extrahera viktig information som belopp, datum, leverantörer och kategorier.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ImageUpload;