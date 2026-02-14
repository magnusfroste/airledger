
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import TransactionConfirmDialog from "@/components/TransactionConfirmDialog";
import QuotaExceeded from "@/components/QuotaExceeded";
import BankStatementReview from "./chat/BankStatementReview";
import MessageList from "./chat/MessageList";
import InputArea from "./chat/InputArea";
import CameraModal from "./chat/CameraModal";
import { useConversation } from "@/hooks/useConversation";
import { useMessages } from "@/hooks/useMessages";
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
  const [pendingImageChoice, setPendingImageChoice] = useState<{
    images: any[];
    uploadedImages: any[];
  } | null>(null);
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

  const {
    bankAnalysis,
    isBankReviewVisible,
    isSavingBatch,
    analyzeBankStatement,
    saveBatchTransactions,
    dismissBankReview,
  } = useBankStatementAnalysis();

  // Check if user is near bottom of messages
  const checkIfNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const threshold = 100; // pixels from bottom
    const isNear = container.scrollTop + container.clientHeight >= container.scrollHeight - threshold;
    setIsNearBottom(isNear);
  };

  // Smart scroll to bottom - only if user is near bottom
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
      if (isNearBottom) {
        scrollToBottom();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isNearBottom]);

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
      setQuotaError({ show: false, subscriptionTier: 'free' });
    }
  };

  // Helper function to handle quota errors
  const handleQuotaError = (error: any, subscriptionTier: string, usage: any) => {
    console.log('Quota error detected:', error);
    setQuotaError({
      show: true,
      subscriptionTier,
      usage
    });

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

  // Send message handler
  const handleSendMessage = async () => {
    if (!inputValue.trim() && pendingImages.length === 0) return;
    if (isLoading) return; // Prevent duplicate calls while loading
    
    // Reset quota error when sending new message
    setQuotaError({ show: false, subscriptionTier: 'free' });
    
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
        // Store pending images for type choice
        setPendingImageChoice({
          images: currentPendingImages,
          uploadedImages,
        });

        // Ask user what type of document
        const choiceMsg = {
          id: (Date.now() + Math.random()).toString(),
          content: `📄 **Vilken typ av dokument är detta?**\n\nVälj nedan så analyserar jag bilden åt dig.`,
          sender: 'ai' as const,
          timestamp: new Date(),
          type: 'text' as const
        };
        addMessage(choiceMsg);
        await saveMessageToDatabase(choiceMsg, limitMessagesInConversation);
        setIsLoading(false);
        return;
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
            
            // Check if this is a quota error (429 status)
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
            // Handle quota error from response data
            handleQuotaError(data, data.subscription_tier || 'free', data.usage);
            return;
          } else {
            throw new Error('Invalid response from chat assistant');
          }
        } catch (chatError: any) {
          console.error('Error in text chat:', chatError);
          
          // Check if this is a quota error
          if (chatError.message?.includes('AI-analyskvoter överskridna') || 
              chatError.message?.includes('429')) {
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
      console.error('Error in handleSendMessage:', error);
      
      // Check if this is a quota error
      if (error.message?.includes('AI-analyskvoter överskridna') || 
          error.message?.includes('429')) {
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

  // Process pending images as receipt or bank statement
  const processImagesAs = async (type: 'receipt' | 'bank_statement') => {
    if (!pendingImageChoice) return;
    setIsLoading(true);

    try {
      for (const image of pendingImageChoice.images) {
        const imageBase64 = await convertFileToBase64(image.file);
        const uploadedImage = pendingImageChoice.uploadedImages.find((img: any) => img.id === image.id);

        if (type === 'receipt') {
          await analyzeReceipt(
            imageBase64,
            uploadedImage,
            addMessage,
            (msg) => saveMessageToDatabase(msg, limitMessagesInConversation)
          );
        } else {
          await analyzeBankStatement(
            imageBase64,
            addMessage,
            (msg) => saveMessageToDatabase(msg, limitMessagesInConversation)
          );
        }
      }
    } catch (error: any) {
      const errorResponse = {
        id: (Date.now() + Math.random()).toString(),
        content: `❌ **Fel vid analys**\n\n${error.message}`,
        sender: 'ai' as const,
        timestamp: new Date(),
        type: 'text' as const
      };
      addMessage(errorResponse);
      await saveMessageToDatabase(errorResponse, limitMessagesInConversation);
    } finally {
      setPendingImageChoice(null);
      setIsLoading(false);
    }
  };

  const handleActionButton = (message: string) => {
    if (isLoading) return;

    // Handle document type choice
    if (pendingImageChoice) {
      const userMessage = {
        id: Date.now().toString(),
        content: message,
        sender: 'user' as const,
        timestamp: new Date(),
        type: 'text' as const,
      };
      addMessage(userMessage);
      saveMessageToDatabase(userMessage, limitMessagesInConversation);

      if (message.includes('Kvitto') || message.includes('kvitto') || message.includes('Faktura') || message.includes('faktura')) {
        processImagesAs('receipt');
      } else if (message.includes('Bankutdrag') || message.includes('bankutdrag') || message.includes('Kontoutdrag')) {
        processImagesAs('bank_statement');
      }
      return;
    }

    setInputValue("");
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
      analysis,
      entries,
      paymentMethod,
      addMessage,
      (msg) => saveMessageToDatabase(msg, limitMessagesInConversation)
    );
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Quota Error Display */}
      {quotaError.show && (
        <div className="shrink-0 p-4 border-b border-border/20">
          <QuotaExceeded
            subscriptionTier={quotaError.subscriptionTier}
            usage={quotaError.usage}
            onDismiss={() => setQuotaError({ show: false, subscriptionTier: 'free' })}
          />
        </div>
      )}

      {/* Messages Container - takes available space and allows scrolling */}
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
        />

        {/* Document type choice buttons */}
        {pendingImageChoice && !isLoading && (
          <div className="flex gap-2 justify-center py-3">
            <button
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              onClick={() => handleActionButton("📄 Kvitto / Faktura")}
            >
              📄 Kvitto / Faktura
            </button>
            <button
              className="px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
              onClick={() => handleActionButton("🏦 Bankutdrag / Kontoutdrag")}
            >
              🏦 Bankutdrag
            </button>
          </div>
        )}

        {/* Bank statement batch review */}
        {isBankReviewVisible && bankAnalysis && (
          <div className="px-4 pb-4">
            <BankStatementReview
              analysis={bankAnalysis}
              onConfirmSelected={(txs) =>
                saveBatchTransactions(txs, addMessage, (msg) =>
                  saveMessageToDatabase(msg, limitMessagesInConversation)
                )
              }
              onDismiss={dismissBankReview}
              isLoading={isSavingBatch}
            />
          </div>
        )}
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
