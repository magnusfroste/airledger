import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

interface ImageUploadOptions {
  file: File;
  userId: string;
  compress?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

interface ImageMetadata {
  originalName: string;
  size: number;
  type: string;
  width?: number;
  height?: number;
  thumbnailPath?: string;
  storagePath: string;
  uploadedAt: string;
}

export class ImageStorageService {
  private static readonly BUCKET_NAME = 'receipts';
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly THUMBNAIL_SIZE = 300;
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  /**
   * Compress and resize image to optimize storage
   */
  private static async compressImage(file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, file.type, quality);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Create thumbnail for quick preview
   */
  private static async createThumbnail(file: File): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const size = this.THUMBNAIL_SIZE;
        canvas.width = size;
        canvas.height = size;

        // Calculate crop dimensions to maintain aspect ratio
        const { width, height } = img;
        const aspectRatio = width / height;
        let sourceX = 0, sourceY = 0, sourceWidth = width, sourceHeight = height;

        if (aspectRatio > 1) {
          sourceWidth = height;
          sourceX = (width - height) / 2;
        } else {
          sourceHeight = width;
          sourceY = (height - width) / 2;
        }

        ctx?.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, size, size);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const thumbnailFile = new File([blob], `thumb_${file.name}`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(thumbnailFile);
          } else {
            resolve(file);
          }
        }, 'image/webp', 0.7);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Get image dimensions
   */
  private static async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Upload image to Supabase Storage with compression and thumbnail
   */
  static async uploadImage({ file, userId, compress = true, maxWidth = 1920, maxHeight = 1080, quality = 0.8 }: ImageUploadOptions): Promise<ImageMetadata> {
    // Validate file
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`Filtyp ${file.type} stöds inte. Tillåtna format: JPG, PNG, WebP`);
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`Filen är för stor (${Math.round(file.size / 1024 / 1024)}MB). Max storlek: 10MB`);
    }

    const imageId = uuidv4();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    
    // Get original dimensions
    const originalDimensions = await this.getImageDimensions(file);

    // Compress main image if needed
    let processedFile = file;
    if (compress) {
      processedFile = await this.compressImage(file, maxWidth, maxHeight, quality);
    }

    // Create thumbnail
    const thumbnailFile = await this.createThumbnail(file);

    // Upload main image
    const imagePath = `${userId}/${imageId}.${fileExtension}`;
    const { error: uploadError } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(imagePath, processedFile);

    if (uploadError) {
      throw new Error(`Fel vid uppladdning: ${uploadError.message}`);
    }

    // Upload thumbnail
    const thumbnailPath = `${userId}/thumbnails/${imageId}_thumb.webp`;
    const { error: thumbnailError } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(thumbnailPath, thumbnailFile);

    if (thumbnailError) {
      console.warn('Failed to upload thumbnail:', thumbnailError);
    }

    const metadata: ImageMetadata = {
      originalName: file.name,
      size: processedFile.size,
      type: file.type,
      width: originalDimensions.width,
      height: originalDimensions.height,
      thumbnailPath: thumbnailError ? undefined : thumbnailPath,
      storagePath: imagePath,
      uploadedAt: new Date().toISOString(),
    };

    return metadata;
  }

  /**
   * Get public URL for image
   */
  static getPublicUrl(path: string): string {
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }

  /**
   * Get signed URL for private image (valid for 1 hour)
   */
  static async getSignedUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .createSignedUrl(path, 3600); // 1 hour

    if (error) {
      throw new Error(`Fel vid hämtning av bild: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * Delete image and thumbnail
   */
  static async deleteImage(path: string, thumbnailPath?: string): Promise<void> {
    const filesToDelete = [path];
    if (thumbnailPath) {
      filesToDelete.push(thumbnailPath);
    }

    const { error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .remove(filesToDelete);

    if (error) {
      throw new Error(`Fel vid borttagning: ${error.message}`);
    }
  }
}