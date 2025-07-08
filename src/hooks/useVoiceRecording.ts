import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const useVoiceRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const { toast } = useToast();

  const convertAudioToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data:audio/webm;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleVoiceRecording = async (
    onTranscription: (text: string) => void,
    setIsLoading: (loading: boolean) => void
  ) => {
    if (!isRecording) {
      try {
        // Start recording
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          }
        });

        const recorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = e => {
          chunks.push(e.data);
        };

        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          
          try {
            setIsLoading(true);
            const audioBase64 = await convertAudioToBase64(blob);
            
            const { data, error } = await supabase.functions.invoke('voice-to-text', {
              body: { audio: audioBase64 }
            });

            if (error) {
              throw new Error(error.message || 'Failed to transcribe audio');
            }

            if (data?.success && data?.text) {
              onTranscription(data.text);
              toast({
                title: "Röst transkriberad!",
                description: "Text har satts i meddelandefältet"
              });
            } else {
              throw new Error('No transcription received');
            }
          } catch (transcribeError) {
            console.error('Error transcribing audio:', transcribeError);
            toast({
              title: "Transkriptionsfel",
              description: "Kunde inte transkribera rösten. Försök igen.",
              variant: "destructive"
            });
          } finally {
            setIsLoading(false);
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
          }
        };

        setMediaRecorder(recorder);
        setIsRecording(true);
        recorder.start();

        toast({
          title: "Spelar in...",
          description: "Klicka igen för att stoppa inspelningen"
        });
      } catch (error) {
        console.error('Error starting recording:', error);
        toast({
          title: "Mikrofonfel",
          description: "Kunde inte komma åt mikrofonen. Kontrollera behörigheter.",
          variant: "destructive"
        });
      }
    } else {
      // Stop recording
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        setIsRecording(false);
        setMediaRecorder(null);
        toast({
          title: "Bearbetar...",
          description: "Transkriberar din röst till text"
        });
      }
    }
  };

  return {
    isRecording,
    handleVoiceRecording
  };
};