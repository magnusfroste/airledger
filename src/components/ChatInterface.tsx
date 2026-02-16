
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import TransactionConfirmDialog from "@/components/TransactionConfirmDialog";
import QuotaExceeded from "@/components/QuotaExceeded";
import MessageList from "./chat/MessageList";
import InputArea from "./chat/InputArea";
import CameraModal from "./chat/CameraModal";
import { useConversation } from "@/hooks/useConversation";
import { useMessages, BankTransaction } from "@/hooks/useMessages";
import { useImageHandling } from "@/hooks/useImageHandling";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { useCamera } from "@/hooks/useCamera";
import { useReceiptAnalysis } from "@/hooks/useReceiptAnalysis";
import { useBankStatementAnalysis } from "@/hooks/useBankStatementAnalysis";
import { useSubscription } from "@/hooks/useSubscription";

const ChatInterface = () => {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [quotaError, setQuotaError] = useState<{
    show: boolean;
    subscriptionTier: string;
    usage?: any;
  }>({ show: false, subscriptionTier: 'free' });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Custom hooks
  const { conversationId, limitMessagesInConversation, handleNewChat } = useConversation();
  const { subscription, usage } = useSubscription();
  
  const { 
    messages, 
    hasMoreMessages, 
    loadingOlderMessages,
    addMessage,
    resetMessages,
    loadOlderMessages,
    saveMessageToDatabase,
    updateMessage
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

  const {
    analyzeBankStatement,
    saveBatchTransactions,
  } = useBankStatementAnalysis();

  // Check if user is near bottom of messages
  const checkIfNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 100;
    const isNear = container.scrollTop + container.clientHeight >= container.scrollHeight - threshold;
    setIsNearBottom(isNear);
  };

  const scrollToBottom = () => {
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isNearBottom) scrollToBottom();
    }, 100);
    return () => clearTimeout(timer);
  }, [isNearBottom]);

  const handleCameraCapture = (file: File) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    handleImageUpload(dataTransfer.files);
  };

  const handleVoiceClick = () => {
    handleVoiceRecording(
      (text: string) => setInputValue(text),
      setIsLoading
    );
  };

  const onNewChat = async () => {
    const success = await handleNewChat();
    if (success) {
      resetMessages();
      setInputValue("");
      clearPendingImages();
      setQuotaError({ show: false, subscriptionTier: 'free' });
    }
  };

  const handleQuotaError = (error: any, subscriptionTier: string, usage: any) => {
    console.log('Quota error detected:', error);
    setQuotaError({ show: true, subscriptionTier, usage });
    const quotaErrorMessage = {
      id: (Date.now() + Math.random()).toString(),
      content: `🚫 **AI-analyskvoter överskridna**\n\nDu har använt alla dina AI-analyser för denna månad. Kvoten återställs den 1:a nästa månad.\n\n**Vad kan du göra?**\n• Uppgradera ditt abonnemang för fler analyser\n• Använd mallfunktionen för vanliga transaktioner\n• Bokför manuellt via Dashboard`,
      sender: 'ai' as const,
      timestamp: new Date(),
      type: 'text' as const
    };
    addMessage(quotaErrorMessage);
    saveMessageToDatabase(quotaErrorMessage, limitMessagesInConversation);
  };

  // Bank statement confirm handler
  const handleBankConfirm = async (messageId: string, transactions: BankTransaction[]) => {
    // Mark message as booking
    updateMessage(messageId, { bankReviewStatus: 'booking' });

    const { errors } = await saveBatchTransactions(
      transactions,
      addMessage,
      (msg) => saveMessageToDatabase(msg, limitMessagesInConversation),
      (current, total, errs) => {
        // Could update progress here if needed
      }
    );

    // Mark message as done
    updateMessage(messageId, { bankReviewStatus: 'done' });
  };

  // Bank statement dismiss handler
  const handleBankDismiss = (messageId: string) => {
    updateMessage(messageId, { bankReviewStatus: 'done', bankAnalysis: undefined });
  };

  // Send message handler
  const handleSendMessage = async () => {
    if (!inputValue.trim() && pendingImages.length === 0) return;
    if (isLoading) return;
    
    setQuotaError({ show: false, subscriptionTier: 'free' });
    
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
    await saveMessageToDatabase(userMessage, limitMessagesInConversation);
    
    setInputValue("");
    const currentPendingImages = [...pendingImages];
    clearPendingImages();
    setIsLoading(true);

    try {
      if (currentPendingImages.length > 0) {
        for (const image of currentPendingImages) {
          const imageBase64 = await convertFileToBase64(image.file);
          const uploadedImage = uploadedImages.find(img => img.id === image.id);

          const classifyMsg = {
            id: (Date.now() + Math.random()).toString(),
            content: `🔍 Analyserar dokumenttyp...`,
            sender: 'ai' as const,
            timestamp: new Date(),
            type: 'text' as const
          };
          addMessage(classifyMsg);

          let docType = 'receipt';
          try {
            const { data: classData } = await supabase.functions.invoke('classify-document', {
              body: { imageBase64 }
            });
            if (classData?.success && classData?.type) {
              docType = classData.type;
            }
          } catch (e) {
            console.warn('Classification failed, defaulting to receipt:', e);
          }

          if (docType === 'bank_statement') {
            await analyzeBankStatement(
              imageBase64,
              addMessage,
              (msg) => saveMessageToDatabase(msg, limitMessagesInConversation)
            );
          } else {
            await analyzeReceipt(
              imageBase64,
              uploadedImage,
              addMessage,
              (msg) => saveMessageToDatabase(msg, limitMessagesInConversation)
            );
          }
        }
      } else {
        try {
          const conversationHistory = messages.slice(-10).map(msg => ({
            sender: msg.sender,
            content: msg.content
          }));

          const { data, error } = await supabase.functions.invoke('chat-assistant', {
            body: { message: inputValue, conversationHistory }
          });

          if (error) {
            if (error.message?.includes('429') || error.message?.includes('AI-analyskvoter överskridna')) {
              handleQuotaError(error, subscription?.subscription_tier || 'free', usage);
              return;
            }
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
          } else if (data?.error?.includes('AI-analyskvoter överskridna')) {
            handleQuotaError(data, data.subscription_tier || 'free', data.usage);
            return;
          } else {
            throw new Error('Invalid response from chat assistant');
          }
        } catch (chatError: any) {
          if (chatError.message?.includes('AI-analyskvoter överskridna') || chatError.message?.includes('429')) {
            handleQuotaError(chatError, subscription?.subscription_tier || 'free', usage);
            return;
          }
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
    } catch (error: any) {
      if (error.message?.includes('AI-analyskvoter överskridna') || error.message?.includes('429')) {
        handleQuotaError(error, subscription?.subscription_tier || 'free', usage);
        return;
      }
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

  const handleActionButton = (message: string) => {
    if (isLoading) return;
    const userMessage = {
      id: Date.now().toString(),
      content: message,
      sender: 'user' as const,
      timestamp: new Date(),
      type: 'text' as const,
    };
    addMessage(userMessage);
    saveMessageToDatabase(userMessage, limitMessagesInConversation);
    setIsLoading(true);
    
    supabase.functions.invoke('chat-assistant', {
      body: {
        message,
        conversationHistory: messages.slice(-10).map(msg => ({
          sender: msg.sender,
          content: msg.content
        }))
      }
    }).then(({ data, error }) => {
      if (error) throw error;
      if (data?.success && data?.response) {
        const aiResponse = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          sender: 'ai' as const,
          timestamp: new Date(),
          type: 'text' as const
        };
        addMessage(aiResponse);
        saveMessageToDatabase(aiResponse, limitMessagesInConversation);
      }
    }).catch((err) => {
      console.error('Action button error:', err);
      const errorResponse = {
        id: (Date.now() + 1).toString(),
        content: `❌ Ett fel uppstod. Försök igen.`,
        sender: 'ai' as const,
        timestamp: new Date(),
        type: 'text' as const
      };
      addMessage(errorResponse);
      saveMessageToDatabase(errorResponse, limitMessagesInConversation);
    }).finally(() => {
      setIsLoading(false);
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const onTransactionConfirm = async (analysis: any, entries: any[], paymentMethod: string) => {
    await handleTransactionConfirm(
      analysis, entries, paymentMethod,
      addMessage,
      (msg) => saveMessageToDatabase(msg, limitMessagesInConversation)
    );
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {quotaError.show && (
        <div className="shrink-0 p-4 border-b border-border/20">
          <QuotaExceeded
            subscriptionTier={quotaError.subscriptionTier}
            usage={quotaError.usage}
            onDismiss={() => setQuotaError({ show: false, subscriptionTier: 'free' })}
          />
        </div>
      )}

      <div 
        ref={messagesContainerRef}
        className="flex-1"
        onScroll={checkIfNearBottom}
      >
        <MessageList
          messages={messages}
          isLoading={isLoading}
          onNewChat={onNewChat}
          messagesEndRef={messagesEndRef}
          hasMoreMessages={hasMoreMessages}
          loadingOlderMessages={loadingOlderMessages}
          onLoadOlderMessages={loadOlderMessages}
          onAction={handleActionButton}
          onBankConfirm={handleBankConfirm}
          onBankDismiss={handleBankDismiss}
        />
      </div>

      <div className="shrink-0 bg-background border-t border-border/20 pb-28 sm:pb-4">
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
          onQuickAction={handleActionButton}
          hasMessages={messages.length > 0}
          lastMessageIsBooking={
            messages.length > 0 &&
            messages[messages.length - 1]?.sender === 'ai' &&
            (messages[messages.length - 1]?.content?.includes('✅') || 
             messages[messages.length - 1]?.content?.includes('bokförd'))
          }
        />
      </div>

      <TransactionConfirmDialog 
        open={confirmDialogOpen} 
        onOpenChange={setConfirmDialogOpen} 
        analysis={pendingAnalysis} 
        onConfirm={onTransactionConfirm} 
      />

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
