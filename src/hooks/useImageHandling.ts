import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PendingImage {
  id: string;
  file: File;
  preview: string;
}

export const useImageHandling = () => {
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const { toast } = useToast();

  const handleImageUpload = (files: FileList) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast({
        title: "Endast bilder tillåtna",
        description: "Vänligen välj endast bildfiler (JPG, PNG, etc.)",
        variant: "destructive"
      });
    }

    imageFiles.forEach(file => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const preview = URL.createObjectURL(file);
      setPendingImages(prev => [...prev, { id, file, preview }]);
    });
  };

  const removePendingImage = (imageId: string) => {
    setPendingImages(prev => {
      const image = prev.find(img => img.id === imageId);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== imageId);
    });
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data:image/jpeg;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadImagesToStorage = async (images: PendingImage[], userId: string) => {
    try {
      const { ImageStorageService } = await import('@/lib/imageStorage');
      
      return await Promise.all(
        images.map(async (img) => {
          try {
            const metadata = await ImageStorageService.uploadImage({
              file: img.file,
              userId: userId,
              compress: true
            });
            
            return {
              id: img.id,
              file: img.file,
              preview: img.preview,
              metadata,
              storagePath: metadata.storagePath,
              thumbnailPath: metadata.thumbnailPath
            };
          } catch (error) {
            console.error('Error uploading image:', error);
            return img; // Fallback to original image
          }
        })
      );
    } catch (error) {
      console.error('Error importing storage service:', error);
      return images; // Fallback
    }
  };

  const clearPendingImages = () => {
    // Clean up image URLs
    pendingImages.forEach(img => URL.revokeObjectURL(img.preview));
    setPendingImages([]);
  };

  return {
    pendingImages,
    handleImageUpload,
    removePendingImage,
    convertFileToBase64,
    uploadImagesToStorage,
    clearPendingImages
  };
};