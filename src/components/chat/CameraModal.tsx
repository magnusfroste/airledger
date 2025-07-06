import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

interface CameraModalProps {
  showCamera: boolean;
  cameraStream: MediaStream | null;
  onStopCamera: () => void;
  onCapturePhoto: () => void;
}

const CameraModal = ({ showCamera, cameraStream, onStopCamera, onCapturePhoto }: CameraModalProps) => {
  if (!showCamera) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="relative">
            {cameraStream && (
              <video 
                id="camera-video" 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-80 object-cover" 
                ref={video => {
                  if (video && cameraStream) {
                    video.srcObject = cameraStream;
                  }
                }} 
              />
            )}
            <div className="absolute top-4 right-4">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={onStopCamera} 
                className="rounded-full h-10 w-10 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-6 text-center space-y-4">
            <p className="text-sm text-gray-600">
              Placera kvittot i kamerans vy och tryck på fotoknappen
            </p>
            <Button 
              onClick={onCapturePhoto} 
              className="w-full rounded-full py-3"
            >
              <Camera className="h-5 w-5 mr-2" />
              Ta foto
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraModal;