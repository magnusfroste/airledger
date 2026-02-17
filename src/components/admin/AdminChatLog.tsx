import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, User, Bot, Search, ChevronDown, ChevronRight, Clock, Hash } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Conversation {
  id: string;
  title: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  user_email?: string;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  created_at: string;
  message_type: string;
}

const AdminChatLog = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    try {
      // Get conversations with message count
      const { data: convos } = await supabase
        .from('airledger_conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (!convos) { setLoading(false); return; }

      // Get message counts
      const enriched: Conversation[] = [];
      for (const c of convos) {
        const { count } = await supabase
          .from('airledger_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', c.id);

        // Get user email from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', c.user_id)
          .single();

        enriched.push({
          ...c,
          message_count: count || 0,
          user_email: profile?.email || c.user_id.slice(0, 8),
        });
      }

      setConversations(enriched);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
    setLoading(false);
  };

  const loadMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    setSelectedConversation(conversationId);
    try {
      const { data } = await supabase
        .from('airledger_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      setMessages(data || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
    setLoadingMessages(false);
  };

  const filtered = conversations.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.title || '').toLowerCase().includes(q) ||
      (c.user_email || '').toLowerCase().includes(q)
    );
  });

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Strip hidden metadata markers from AI responses
  const cleanContent = (content: string) =>
    content.replace(/<!--[\s\S]*?-->/g, '').trim();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Chattloggar
            <Badge variant="outline" className="ml-auto">{conversations.length} konversationer</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sök på titel eller användare..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Conversation list */}
            <ScrollArea className="h-[500px] border rounded-lg">
              <div className="divide-y">
                {filtered.map(c => (
                  <button
                    key={c.id}
                    onClick={() => loadMessages(c.id)}
                    className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${
                      selectedConversation === c.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {selectedConversation === c.id ? (
                        <ChevronDown className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {c.title || 'Namnlös konversation'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate">{c.user_email}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />{c.message_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />{formatTime(c.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Inga konversationer hittade
                  </p>
                )}
              </div>
            </ScrollArea>

            {/* Message viewer */}
            <div className="lg:col-span-2 border rounded-lg">
              {selectedConversation ? (
                loadingMessages ? (
                  <div className="flex items-center justify-center h-[500px]">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="p-4 space-y-3">
                      {messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          {msg.sender !== 'user' && (
                            <Bot className="h-5 w-5 text-primary shrink-0 mt-1" />
                          )}
                          <div
                            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                              msg.sender === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {msg.sender === 'user' ? (
                              <p>{msg.content}</p>
                            ) : (
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{cleanContent(msg.content)}</ReactMarkdown>
                              </div>
                            )}
                            <p className="text-[10px] opacity-60 mt-1">
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                          {msg.sender === 'user' && (
                            <User className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                          )}
                        </div>
                      ))}
                      {messages.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Inga meddelanden i denna konversation
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                )
              ) : (
                <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                  <p className="text-sm">Välj en konversation för att se chattloggen</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminChatLog;
