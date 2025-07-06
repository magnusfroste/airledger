import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TransactionConfirmDialog from "@/components/TransactionConfirmDialog";
import MessageList from "./chat/MessageList";
import InputArea from "./chat/InputArea";
import CameraModal from "./chat/CameraModal";
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'voice' | 'image';
  images?: Array<{
    id: string;
    file: File;
    preview: string;
    analysis?: {
      type: 'receipt' | 'invoice' | 'bank_statement';
      amount?: number;
      vendor?: string;
      date?: string;
      description?: string;
    };
  }>;
}
const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    content: 'Hej och välkommen till Air Ledger! 👋 \n\nJag är din AI-assistent för bokföring som kan hjälpa dig med allt från kvittoanalys till att svara på frågor om din bokföring.\n\n**🤖 Vad kan jag hjälpa dig med?**\n• 📷 **Ta foto av kvitton** - Använd kameraknappen för att fotografera kvitton direkt\n• 📊 **Analysera kvitton automatiskt** - Jag läser av belopp, datum och leverantör\n• 💬 **Svara på bokföringsfrågor** - Fråga mig om svensk bokföring och BAS-kontoplanen\n• 🏷️ **Föreslå transaktionsmallar** - Beskriv transaktionen så föreslår jag rätt mall\n• 📋 **Registrera transaktioner** - Fakturor, betalningar och utgifter\n\n**💡 Snabbtips för att komma igång:**\n• Börja med att fota ett kvitto - jag visar hur det fungerar!\n• Fråga mig om mina funktioner - jag berättar gärna mer\n• Använd röstinspelning om du vill prata istället för att skriva\n• Separera "fakturera kund" från "få betalning" - det är olika saker\n\nVad undrar du över idag? 🚀',
    sender: 'ai',
    timestamp: new Date(),
    type: 'text'
  }]);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [pendingImages, setPendingImages] = useState<Array<{
    id: string;
    file: File;
    preview: string;
  }>>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    toast
  } = useToast();

  // Load or create conversation on mount
  useEffect(() => {
    const initializeConversation = async () => {
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) return;

        // Try to find existing conversation
        const {
          data: conversations,
          error: fetchError
        } = await supabase.from('airledger_conversations').select('*').eq('user_id', user.id).order('updated_at', {
          ascending: false
        }).limit(1);
        let currentConversationId = null;
        if (fetchError) {
          console.error('Error fetching conversations:', fetchError);
          return;
        }
        if (conversations && conversations.length > 0) {
          // Use existing conversation
          currentConversationId = conversations[0].id;
        } else {
          // Create new conversation
          const {
            data: newConversation,
            error: createError
          } = await supabase.from('airledger_conversations').insert({
            user_id: user.id,
            title: 'Chat Session'
          }).select().single();
          if (createError) {
            console.error('Error creating conversation:', createError);
            return;
          }
          currentConversationId = newConversation.id;
        }
        setConversationId(currentConversationId);

        // Load existing messages for this conversation
        if (currentConversationId) {
          const {
            data: existingMessages,
            error: messagesError
          } = await supabase.from('airledger_messages').select('*').eq('conversation_id', currentConversationId).order('created_at', {
            ascending: true
          });
          if (messagesError) {
            console.error('Error loading messages:', messagesError);
            return;
          }
          if (existingMessages && existingMessages.length > 0) {
            const loadedMessages: Message[] = existingMessages.map(msg => ({
              id: msg.id,
              content: msg.content,
              sender: msg.sender as 'user' | 'ai',
              timestamp: new Date(msg.created_at),
              type: msg.message_type as 'text' | 'voice' | 'image' || 'text'
            }));

            // Keep welcome message and add loaded messages
            setMessages(prev => [prev[0], ...loadedMessages]);
          }
        }
      } catch (error) {
        console.error('Error initializing conversation:', error);
      }
    };
    initializeConversation();
  }, []);

  // Save message to database
  const saveMessageToDatabase = async (message: Message) => {
    if (!conversationId) return;
    try {
      await supabase.from('airledger_messages').insert({
        conversation_id: conversationId,
        content: message.content,
        sender: message.sender,
        message_type: message.type || 'text'
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };
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
      setPendingImages(prev => [...prev, {
        id,
        file,
        preview
      }]);
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
  const handleSendMessage = async () => {
    if (!inputValue.trim() && pendingImages.length === 0) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue || (pendingImages.length > 0 ? "Bifogade bilder för analys" : ""),
      sender: 'user',
      timestamp: new Date(),
      type: pendingImages.length > 0 ? 'image' : 'text',
      images: pendingImages.length > 0 ? pendingImages.map(img => ({
        id: img.id,
        file: img.file,
        preview: img.preview
      })) : undefined
    };
    setMessages(prev => [...prev, userMessage]);

    // Save user message to database
    await saveMessageToDatabase(userMessage);
    setInputValue("");
    const currentPendingImages = [...pendingImages];
    setPendingImages([]);
    setIsLoading(true);
    try {
      if (currentPendingImages.length > 0) {
        // Process images with OpenAI
        for (const image of currentPendingImages) {
          try {
            const imageBase64 = await convertFileToBase64(image.file);
            const {
              data,
              error
            } = await supabase.functions.invoke('analyze-receipt', {
              body: {
                imageBase64
              }
            });
            if (error) {
              console.error('Error analyzing receipt:', error);
              throw new Error(error.message || 'Failed to analyze receipt');
            }
            if (data?.success && data?.analysis) {
              const analysis = data.analysis;

              // Show confirmation dialog instead of auto-saving
              setPendingAnalysis(analysis);
              setConfirmDialogOpen(true);
              const aiResponse: Message = {
                id: (Date.now() + Math.random()).toString(),
                content: `🎯 **Kvittoanalys klar!**\n\n**${analysis.vendor}** - ${analysis.date}\n**Belopp:** ${analysis.total_amount} kr\n**Dokumenttyp:** ${analysis.document_type === 'receipt' ? 'Kvitto' : 'Faktura'} (${analysis.document_type_confidence}% säkerhet)\n\n**Föreslaget betalningssätt:** ${analysis.suggested_payment_method}\n\n📋 Klicka "Bekräfta bokföring" för att granska och spara transaktionen.`,
                sender: 'ai',
                timestamp: new Date(),
                type: 'text'
              };
              setMessages(prev => [...prev, aiResponse]);

              // Save AI response to database
              await saveMessageToDatabase(aiResponse);
              toast({
                title: "Kvitto analyserat!",
                description: `${analysis.vendor} - Väntar på bekräftelse`
              });
            } else {
              throw new Error('Invalid response from analysis');
            }
          } catch (imageError) {
            console.error('Error processing image:', imageError);
            const errorResponse: Message = {
              id: (Date.now() + Math.random()).toString(),
              content: `❌ **Fel vid analys av kvitto**\n\nJag kunde inte analysera bilden. Kontrollera att det är ett tydligt kvitto och försök igen.\n\nFelmeddelande: ${imageError.message}`,
              sender: 'ai',
              timestamp: new Date(),
              type: 'text'
            };
            setMessages(prev => [...prev, errorResponse]);

            // Save error message to database
            await saveMessageToDatabase(errorResponse);
            toast({
              title: "Analysfel",
              description: "Kunde inte analysera kvittot. Försök igen.",
              variant: "destructive"
            });
          }
        }
      } else {
        // Handle text-only messages with AI assistant
        try {
          // Prepare conversation history (last 10 messages for context)
          const conversationHistory = messages.slice(-10).map(msg => ({
            sender: msg.sender,
            content: msg.content
          }));
          const {
            data,
            error
          } = await supabase.functions.invoke('chat-assistant', {
            body: {
              message: inputValue,
              conversationHistory: conversationHistory
            }
          });
          if (error) {
            console.error('Error calling chat assistant:', error);
            throw new Error(error.message || 'Failed to get AI response');
          }
          if (data?.success && data?.response) {
            const aiResponse: Message = {
              id: (Date.now() + 1).toString(),
              content: data.response,
              sender: 'ai',
              timestamp: new Date(),
              type: 'text'
            };
            setMessages(prev => [...prev, aiResponse]);

            // Save AI response to database  
            await saveMessageToDatabase(aiResponse);
          } else {
            throw new Error('Invalid response from chat assistant');
          }
        } catch (chatError) {
          console.error('Error in text chat:', chatError);
          const errorResponse: Message = {
            id: (Date.now() + 1).toString(),
            content: `Ursäkta, jag har tekniska problem just nu. Försök igen om en stund eller ladda upp ett kvitto så kan jag analysera det åt dig!\n\nFel: ${chatError.message}`,
            sender: 'ai',
            timestamp: new Date(),
            type: 'text'
          };
          setMessages(prev => [...prev, errorResponse]);

          // Save error message to database
          await saveMessageToDatabase(errorResponse);
        }
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      const errorResponse: Message = {
        id: (Date.now() + Math.random()).toString(),
        content: `❌ **Ett fel uppstod**\n\nJag kunde inte behandla din förfrågan just nu. Försök igen om en stund.\n\nFelmeddelande: ${error.message}`,
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorResponse]);

      // Save error message to database
      await saveMessageToDatabase(errorResponse);
    } finally {
      setIsLoading(false);
      // Clean up image URLs
      currentPendingImages.forEach(img => URL.revokeObjectURL(img.preview));
    }
  };
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
  const handleVoiceRecording = async () => {
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
          const blob = new Blob(chunks, {
            type: 'audio/webm'
          });
          try {
            setIsLoading(true);
            const audioBase64 = await convertAudioToBase64(blob);
            const {
              data,
              error
            } = await supabase.functions.invoke('voice-to-text', {
              body: {
                audio: audioBase64
              }
            });
            if (error) {
              throw new Error(error.message || 'Failed to transcribe audio');
            }
            if (data?.success && data?.text) {
              setInputValue(data.text);
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
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Camera functionality
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          // Use back camera on mobile
          width: {
            ideal: 1920
          },
          height: {
            ideal: 1080
          }
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
  const capturePhoto = () => {
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
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const preview = URL.createObjectURL(file);
      setPendingImages(prev => [...prev, {
        id,
        file,
        preview
      }]);

      // Stop camera after taking photo
      stopCamera();
      toast({
        title: "Foto taget!",
        description: "Bilden har lagts till för analys"
      });
    }, 'image/jpeg', 0.9);
  };

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Scroll to bottom when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, []);
  const handleNewChat = () => {
    // Reset messages to only show welcome message
    setMessages([{
      id: '1',
      content: 'Hej och välkommen till Air Ledger! 👋 \n\nJag är din AI-assistent för bokföring som kan hjälpa dig med allt från kvittoanalys till att svara på frågor om din bokföring.\n\n**🤖 Vad kan jag hjälpa dig med?**\n• 📷 **Ta foto av kvitton** - Använd kameraknappen för att fotografera kvitton direkt\n• 📊 **Analysera kvitton automatiskt** - Jag läser av belopp, datum och leverantör\n• 💬 **Svara på bokföringsfrågor** - Fråga mig om svensk bokföring och BAS-kontoplanen\n• 🏷️ **Föreslå transaktionsmallar** - Beskriv transaktionen så föreslår jag rätt mall\n• 📋 **Registrera transaktioner** - Fakturor, betalningar och utgifter\n\n**💡 Snabbtips för att komma igång:**\n• Börja med att fota ett kvitto - jag visar hur det fungerar!\n• Fråga mig om mina funktioner - jag berättar gärna mer\n• Använd röstinspelning om du vill prata istället för att skriva\n• Separera "fakturera kund" från "få betalning" - det är olika saker\n\nVad undrar du över idag? 🚀',
      sender: 'ai',
      timestamp: new Date(),
      type: 'text'
    }]);
    
    // Clear input and pending images
    setInputValue("");
    setPendingImages([]);
    
    toast({
      title: "Ny chat startad",
      description: "Chatvyn har rensats för en ny konversation"
    });
  };

  const handleTransactionConfirm = async (analysis: any, entries: any[], paymentMethod: string) => {
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('save-transaction', {
        body: {
          analysis,
          entries,
          paymentMethod
        }
      });
      if (error) {
        throw new Error(error.message || 'Failed to save transaction');
      }
      if (data?.success && data?.transaction) {
        const aiResponse: Message = {
          id: (Date.now() + Math.random()).toString(),
          content: `✅ **Transaktion bokförd!**\n\n**${analysis.vendor}** - ${analysis.date}\n**Belopp:** ${analysis.total_amount} kr\n**Betalning:** ${paymentMethod}\n\n**Bokföringsposter:**\n${entries.map((entry: any) => `• ${entry.account_code} ${entry.account_name}: ${entry.debit_amount > 0 ? `Debet ${entry.debit_amount} kr` : `Kredit ${entry.credit_amount} kr`}`).join('\n')}\n\n📋 Transaktionen är nu bokförd i systemet.`,
          sender: 'ai',
          timestamp: new Date(),
          type: 'text'
        };
        setMessages(prev => [...prev, aiResponse]);

        // Save AI response to database
        await saveMessageToDatabase(aiResponse);
      }
    } catch (error) {
      throw error;
    }
  };
  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Messages Container */}
      <MessageList
        messages={messages}
        isLoading={isLoading}
        onNewChat={handleNewChat}
        messagesEndRef={messagesEndRef}
      />

      {/* Input Area - Fixed at bottom */}
      <div className="shrink-0 bg-background border-t border-border/20">
        <InputArea
          inputValue={inputValue}
          setInputValue={setInputValue}
          pendingImages={pendingImages}
          isRecording={isRecording}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          onKeyPress={handleKeyPress}
          onImageUpload={handleImageUpload}
          onRemovePendingImage={removePendingImage}
          onVoiceRecording={handleVoiceRecording}
          onStartCamera={startCamera}
        />
      </div>

      {/* Transaction Confirmation Dialog */}
      <TransactionConfirmDialog 
        open={confirmDialogOpen} 
        onOpenChange={setConfirmDialogOpen} 
        analysis={pendingAnalysis} 
        onConfirm={handleTransactionConfirm} 
      />

      {/* Camera Modal */}
      <CameraModal
        showCamera={showCamera}
        cameraStream={cameraStream}
        onStopCamera={stopCamera}
        onCapturePhoto={capturePhoto}
      />
    </div>
  );
};
export default ChatInterface;