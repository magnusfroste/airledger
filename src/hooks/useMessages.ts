import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MessageImage {
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
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'voice' | 'image';
  images?: MessageImage[];
}

const WELCOME_MESSAGE: Message = {
  id: '1',
  content: 'Hej och välkommen till Air Ledger! 👋 \n\nJag är din AI-assistent för bokföring som kan hjälpa dig med allt från kvittoanalys till att svara på frågor om din bokföring.\n\n**🤖 Vad kan jag hjälpa dig med?**\n• 📷 **Ta foto av kvitton** - Använd kameraknappen för att fotografera kvitton direkt\n• 📊 **Analysera kvitton automatiskt** - Jag läser av belopp, datum och leverantör\n• 💬 **Svara på bokföringsfrågor** - Fråga mig om svensk bokföring och BAS-kontoplanen\n• 🏷️ **Föreslå transaktionsmallar** - Beskriv transaktionen så föreslår jag rätt mall\n• 📋 **Registrera transaktioner** - Fakturor, betalningar och utgifter\n\n**💡 Snabbtips för att komma igång:**\n• Börja med att fota ett kvitto - jag visar hur det fungerar!\n• Fråga mig om mina funktioner - jag berättar gärna mer\n• Använd röstinspelning om du vill prata istället för att skriva\n• Separera "fakturera kund" från "få betalning" - det är olika saker\n\nVad undrar du över idag? 🚀',
  sender: 'ai',
  timestamp: new Date(),
  type: 'text'
};

export const useMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);

  // Load messages when conversation is ready
  useEffect(() => {
    if (!conversationId) return;

    const loadMessages = async () => {
      try {
        // First, get total message count
        const { count: totalCount } = await supabase
          .from('airledger_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversationId);

        // Then load latest 10 messages
        const { data: existingMessages, error: messagesError } = await supabase
          .from('airledger_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (messagesError) {
          console.error('Error loading messages:', messagesError);
          return;
        }

        if (existingMessages && existingMessages.length > 0) {
          const loadedMessages: Message[] = existingMessages
            .reverse() // Reverse to show chronological order
            .map(msg => ({
              id: msg.id,
              content: msg.content,
              sender: msg.sender as 'user' | 'ai',
              timestamp: new Date(msg.created_at),
              type: msg.message_type as 'text' | 'voice' | 'image' || 'text'
            }));

          // Keep welcome message and add loaded messages
          setMessages(prev => [prev[0], ...loadedMessages]);
          
          // Set if there are more messages to load
          setHasMoreMessages((totalCount || 0) > existingMessages.length);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();
  }, [conversationId]);

  // Load older messages (lazy loading)
  const loadOlderMessages = async () => {
    if (!conversationId || loadingOlderMessages || !hasMoreMessages) return;
    
    setLoadingOlderMessages(true);
    try {
      // Get the oldest message timestamp from current messages (excluding welcome message)
      const oldestMessage = messages.slice(1).sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )[0];
      
      if (!oldestMessage) {
        setLoadingOlderMessages(false);
        return;
      }

      const { data: olderMessages, error } = await supabase
        .from('airledger_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .lt('created_at', oldestMessage.timestamp.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading older messages:', error);
        return;
      }

      if (olderMessages && olderMessages.length > 0) {
        const loadedOlderMessages: Message[] = olderMessages
          .reverse()
          .map(msg => ({
            id: msg.id,
            content: msg.content,
            sender: msg.sender as 'user' | 'ai',
            timestamp: new Date(msg.created_at),
            type: msg.message_type as 'text' | 'voice' | 'image' || 'text'
          }));

        // Insert older messages after welcome message
        setMessages(prev => [prev[0], ...loadedOlderMessages, ...prev.slice(1)]);
        
        // Check if there are more messages to load
        setHasMoreMessages(olderMessages.length === 10);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  // Save message to database
  const saveMessageToDatabase = async (message: Message, limitMessages: () => Promise<void>) => {
    if (!conversationId) return;
    
    try {
      await supabase.from('airledger_messages').insert({
        conversation_id: conversationId,
        content: message.content,
        sender: message.sender,
        message_type: message.type || 'text'
      });

      // Limit messages after saving (run in background)
      limitMessages();
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  // Add message to local state
  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  // Reset messages to welcome only
  const resetMessages = () => {
    setMessages([WELCOME_MESSAGE]);
    setHasMoreMessages(false);
  };

  return {
    messages,
    hasMoreMessages,
    loadingOlderMessages,
    addMessage,
    resetMessages,
    loadOlderMessages,
    saveMessageToDatabase
  };
};
