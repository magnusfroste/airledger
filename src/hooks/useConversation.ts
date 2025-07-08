import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useConversation = () => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { toast } = useToast();

  // Load or create conversation on mount
  useEffect(() => {
    const initializeConversation = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Try to find existing conversation
        const { data: conversations, error: fetchError } = await supabase
          .from('airledger_conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        let currentConversationId = null;

        if (fetchError) {
          console.error('Error fetching conversations:', fetchError);
          return;
        }

        if (conversations && conversations.length > 0) {
          currentConversationId = conversations[0].id;
        } else {
          // Create new conversation
          const { data: newConversation, error: createError } = await supabase
            .from('airledger_conversations')
            .insert({
              user_id: user.id,
              title: 'Chat Session'
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating conversation:', createError);
            return;
          }
          currentConversationId = newConversation.id;
        }

        setConversationId(currentConversationId);
      } catch (error) {
        console.error('Error initializing conversation:', error);
      }
    };

    initializeConversation();
  }, []);

  // Limit messages in conversation (max 100)
  const limitMessagesInConversation = async () => {
    if (!conversationId) return;
    
    try {
      // Count total messages
      const { count: totalCount } = await supabase
        .from('airledger_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);

      if (totalCount && totalCount > 100) {
        // Get oldest messages to delete
        const { data: oldestMessages } = await supabase
          .from('airledger_messages')
          .select('id')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(totalCount - 100);

        if (oldestMessages && oldestMessages.length > 0) {
          const idsToDelete = oldestMessages.map(msg => msg.id);
          
          await supabase
            .from('airledger_messages')
            .delete()
            .in('id', idsToDelete);

          toast({
            title: "Gamla meddelanden rensades",
            description: `${oldestMessages.length} äldre meddelanden togs bort för att hålla konversationen hanterbar.`,
            variant: "default"
          });
        }
      }
    } catch (error) {
      console.error('Error limiting messages:', error);
    }
  };

  // Clear conversation
  const handleNewChat = async () => {
    if (!conversationId) return;
    
    try {
      // Clear all messages from database for this conversation
      await supabase
        .from('airledger_messages')
        .delete()
        .eq('conversation_id', conversationId);
      
      toast({
        title: "Ny chat startad",
        description: "All chatthistorik har rensats från databasen"
      });
      
      return true;
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast({
        title: "Fel vid rensning",
        description: "Kunde inte rensa chatthistoriken från databasen",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    conversationId,
    limitMessagesInConversation,
    handleNewChat
  };
};