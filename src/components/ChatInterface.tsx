import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import TransactionConfirmDialog from "@/components/TransactionConfirmDialog";
import MessageList from "./chat/MessageList";
import InputArea from "./chat/InputArea";
import CameraModal from "./chat/CameraModal";
import { useConversation } from "@/hooks/useConversation";
import { useMessages } from "@/hooks/useMessages";
import { useImageHandling } from "@/hooks/useImageHandling";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { useCamera } from "@/hooks/useCamera";
import { useReceiptAnalysis } from "@/hooks/useReceiptAnalysis";

const ChatInterface = () => {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Custom hooks
  const { conversationId, limitMessagesInConversation, handleNewChat } = useConversation();
  const { 
    messages, 
    hasMoreMessages, 
    loadingOlderMessages,
    addMessage,
    resetMessages,
    loadOlderMessages,
    saveMessageToDatabase
  } = useMessages(conversationId);
  
  const {
    pendingImages,
    handleImageUpload,
    removePendingImage,
    convertFileToBase64,
    uploadImagesToStorage,
    clearPendingImages
  } = useImageHandling();

  const { isRecording, handleVoiceRecording } = useVoiceRecording();
  
  const {
    showCamera,
    cameraStream,
    startCamera,
    stopCamera,
    capturePhoto
  } = useCamera();

  const {
    confirmDialogOpen,
    setConfirmDialogOpen,
    pendingAnalysis,
    analyzeReceipt,
    handleTransactionConfirm
  } = useReceiptAnalysis();

  // Scroll to bottom functionality
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle camera photo capture
  const handleCameraCapture = (file: File) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const preview = URL.createObjectURL(file);
    
    // Add image to pending images using the existing handler
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    handleImageUpload(dataTransfer.files);
  };

  // Voice recording handler
  const handleVoiceClick = () => {
    handleVoiceRecording(
      (text: string) => setInputValue(text),
      setIsLoading
    );
  };

  // New chat handler
  const onNewChat = async () => {
    const success = await handleNewChat();
    if (success) {
      resetMessages();
      setInputValue("");
      clearPendingImages();
    }
  };

  // Send message handler
  const handleSendMessage = async () => {
    if (!inputValue.trim() && pendingImages.length === 0) return;
    if (isLoading) return; // Prevent duplicate calls while loading
    
    // Upload images to permanent storage if any
    let uploadedImages: any[] = [];
    if (pendingImages.length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        uploadedImages = await uploadImagesToStorage(pendingImages, user.id);
      }
    }

    const userMessage = {
      id: Date.now().toString(),
      content: inputValue || (pendingImages.length > 0 ? "Bifogade bilder för analys" : ""),
      sender: 'user' as const,
      timestamp: new Date(),
      type: pendingImages.length > 0 ? 'image' as const : 'text' as const,
      images: uploadedImages.length > 0 ? uploadedImages : undefined
    };

    addMessage(userMessage);
    
    // Save user message to database
    await saveMessageToDatabase(userMessage, limitMessagesInConversation);
    
    setInputValue("");
    const currentPendingImages = [...pendingImages];
    clearPendingImages();
    setIsLoading(true);

    try {
      if (currentPendingImages.length > 0) {
        // Process images with OpenAI
        for (const image of currentPendingImages) {
          const imageBase64 = await convertFileToBase64(image.file);
          const uploadedImage = uploadedImages.find(img => img.id === image.id);
          
          await analyzeReceipt(
            imageBase64,
            uploadedImage,
            addMessage,
            (msg) => saveMessageToDatabase(msg, limitMessagesInConversation)
          );
        }
      } else {
        // Handle text-only messages with AI assistant
        try {
          // Prepare conversation history (last 10 messages for context)
          const conversationHistory = messages.slice(-10).map(msg => ({
            sender: msg.sender,
            content: msg.content
          }));

          const { data, error } = await supabase.functions.invoke('chat-assistant', {
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
            const aiResponse = {
              id: (Date.now() + 1).toString(),
              content: data.response,
              sender: 'ai' as const,
              timestamp: new Date(),
              type: 'text' as const
            };

            addMessage(aiResponse);
            await saveMessageToDatabase(aiResponse, limitMessagesInConversation);
          } else {
            throw new Error('Invalid response from chat assistant');
          }
        } catch (chatError) {
          console.error('Error in text chat:', chatError);
          const errorResponse = {
            id: (Date.now() + 1).toString(),
            content: `Ursäkta, jag har tekniska problem just nu. Försök igen om en stund eller ladda upp ett kvitto så kan jag analysera det åt dig!\n\nFel: ${chatError.message}`,
            sender: 'ai' as const,
            timestamp: new Date(),
            type: 'text' as const
          };

          addMessage(errorResponse);
          await saveMessageToDatabase(errorResponse, limitMessagesInConversation);
        }
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      const errorResponse = {
        id: (Date.now() + Math.random()).toString(),
        content: `❌ **Ett fel uppstod**\n\nJag kunde inte behandla din förfrågan just nu. Försök igen om en stund.\n\nFelmeddelande: ${error.message}`,
        sender: 'ai' as const,
        timestamp: new Date(),
        type: 'text' as const
      };

      addMessage(errorResponse);
      await saveMessageToDatabase(errorResponse, limitMessagesInConversation);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const onTransactionConfirm = async (analysis: any, entries: any[], paymentMethod: string) => {
    await handleTransactionConfirm(
      analysis,
      entries,
      paymentMethod,
      addMessage,
      (msg) => saveMessageToDatabase(msg, limitMessagesInConversation)
    );
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Messages Container - takes available space and allows scrolling */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          onNewChat={onNewChat}
          messagesEndRef={messagesEndRef}
          hasMoreMessages={hasMoreMessages}
          loadingOlderMessages={loadingOlderMessages}
          onLoadOlderMessages={loadOlderMessages}
        />
      </div>

      {/* Input Area - Fixed at bottom with bottom nav padding */}
      <div className="shrink-0 bg-background border-t border-border/20 pb-20 sm:pb-4">
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
          onVoiceRecording={handleVoiceClick}
          onStartCamera={startCamera}
        />
      </div>

      {/* Transaction Confirmation Dialog */}
      <TransactionConfirmDialog 
        open={confirmDialogOpen} 
        onOpenChange={setConfirmDialogOpen} 
        analysis={pendingAnalysis} 
        onConfirm={onTransactionConfirm} 
      />

      {/* Camera Modal */}
      <CameraModal
        showCamera={showCamera}
        cameraStream={cameraStream}
        onStopCamera={stopCamera}
        onCapturePhoto={() => capturePhoto(handleCameraCapture)}
      />
    </div>
  );
};

export default ChatInterface;