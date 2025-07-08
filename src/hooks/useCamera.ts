import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export const useCamera = () => {
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setCameraStream(stream);
      setShowCamera(true);
      
      toast({
        title: "Kamera startad",
        description: "Ta ett foto av ditt kvitto"
      });
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Kamerafel",
        description: "Kunde inte komma åt kameran. Kontrollera behörigheter.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = (onPhotoCapture: (file: File) => void) => {
    if (!cameraStream) return;
    
    const video = document.getElementById('camera-video') as HTMLVideoElement;
    if (!video) return;

    // Create canvas to capture the photo
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw the video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Convert canvas to blob
    canvas.toBlob(blob => {
      if (!blob) return;

      // Create file from blob  
      const file = new File([blob], `photo-${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });

      onPhotoCapture(file);

      // Stop camera after taking photo
      stopCamera();
      
      toast({
        title: "Foto taget!",
        description: "Bilden har lagts till för analys"
      });
    }, 'image/jpeg', 0.9);
  };

  return {
    showCamera,
    cameraStream,
    startCamera,
    stopCamera,
    capturePhoto
  };
};