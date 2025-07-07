import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Plus, 
  Clock, 
  TrendingUp, 
  Settings,
  Calendar,
  Hash,
  Tag,
  Shield,
  Crown,
  Search
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AccountSelector } from "@/components/AccountSelector";

interface TransactionTemplate {
  id: string;
  template_name: string;
  description: string;
  category: string;
  template_entries: any;
  usage_count: number;
  last_used_at: string | null;
  auto_suggest: boolean;
  keywords: string[] | null;
  is_system_template: boolean;
  created_at: string;
}

interface TemplateUsage {
  id: string;
  template_id: string;
  used_at: string;
  template_name: string;
  transaction_description: string;
}

const TemplateManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [templateUsage, setTemplateUsage] = useState<TemplateUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TransactionTemplate | null>(null);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // New template form state
  const [newTemplate, setNewTemplate] = useState({
    template_name: '',
    description: '',
    category: '',
    keywords: '',
    is_system_template: false,
    template_entries: [
      { account_code: '', account_name: '', type: 'debit', description: '' },
      { account_code: '', account_name: '', type: 'credit', description: '' }
    ]
  });

  useEffect(() => {
    fetchTemplatesAndUsage();
    checkDeveloperStatus();
  }, []);

  const startEditTemplate = (template: TransactionTemplate) => {
    setEditingTemplate({
      ...template,
      keywords: template.keywords || []
    });
    setShowEditDialog(true);
  };

  const updateTemplate = async () => {
    if (!editingTemplate) return;
    
    try {
      if (!editingTemplate.template_name || !editingTemplate.description) {
        toast({
          title: "Ofullständiga uppgifter",
          description: "Fyll i mallnamn och beskrivning.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('airledger_transaction_templates')
        .update({
          template_name: editingTemplate.template_name,
          description: editingTemplate.description,
          category: editingTemplate.category,
          keywords: Array.isArray(editingTemplate.keywords) ? editingTemplate.keywords : [],
          template_entries: editingTemplate.template_entries.filter(entry => 
            entry.account_code && entry.account_name
          ),
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;

      toast({
        title: "Mall uppdaterad",
        description: `Mallen "${editingTemplate.template_name}" har uppdaterats.`,
      });

      setShowEditDialog(false);
      setEditingTemplate(null);
      fetchTemplatesAndUsage();

    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Fel vid uppdatering",
        description: "Kunde inte uppdatera mallen. Försök igen.",
        variant: "destructive",
      });
    }
  };

  const checkDeveloperStatus = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_developer')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setIsDeveloper(profile.is_developer || false);
      }
    } catch (error) {
      console.error('Error checking developer status:', error);
    }
  };

  const fetchTemplatesAndUsage = async () => {
    try {
      setLoading(true);
      
      // Fetch templates (both system and user-created)
      const { data: templatesData, error: templatesError } = await supabase
        .from('airledger_transaction_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (templatesError) throw templatesError;

      // Fetch template usage history with manual joins
      const { data: usageData, error: usageError } = await supabase
        .from('airledger_template_usage')
        .select('*')
        .order('used_at', { ascending: false })
        .limit(20);

      let processedUsageData: TemplateUsage[] = [];
      
      if (usageData && !usageError) {
        // Manually fetch template names and transaction descriptions
        for (const usage of usageData) {
          const { data: template } = await supabase
            .from('airledger_transaction_templates')
            .select('template_name')
            .eq('id', usage.template_id)
            .single();
          
          const { data: transaction } = await supabase
            .from('airledger_transactions')
            .select('description')
            .eq('id', usage.transaction_id)
            .single();

          processedUsageData.push({
            id: usage.id,
            template_id: usage.template_id,
            used_at: usage.used_at,
            template_name: template?.template_name || 'Okänd mall',
            transaction_description: transaction?.description || 'Okänd transaktion'
          });
        }
      }

      if (usageError) throw usageError;

      setTemplates(templatesData || []);
      setTemplateUsage(processedUsageData);

    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Fel vid laddning",
        description: "Kunde inte hämta malldata. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async () => {
    try {
      if (!newTemplate.template_name || !newTemplate.description) {
        toast({
          title: "Ofullständiga uppgifter",
          description: "Fyll i mallnamn och beskrivning.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('airledger_transaction_templates')
        .insert({
          user_id: user?.id,
          template_name: newTemplate.template_name,
          description: newTemplate.description,
          category: newTemplate.category,
          keywords: newTemplate.keywords.split(',').map(k => k.trim()),
          template_entries: newTemplate.template_entries.filter(entry => 
            entry.account_code && entry.account_name
          ),
          is_system_template: isDeveloper ? newTemplate.is_system_template : false,
          is_recurring: false
        });

      if (error) throw error;

      toast({
        title: "Mall skapad",
        description: `Mallen "${newTemplate.template_name}" har skapats.`,
      });

      setShowCreateDialog(false);
      setNewTemplate({
        template_name: '',
        description: '',
        category: '',
        keywords: '',
        is_system_template: false,
        template_entries: [
          { account_code: '', account_name: '', type: 'debit', description: '' },
          { account_code: '', account_name: '', type: 'credit', description: '' }
        ]
      });
      fetchTemplatesAndUsage();

    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Fel vid skapande",
        description: "Kunde inte skapa mallen. Försök igen.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter templates based on search term and category
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchTerm || 
      template.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.keywords && template.keywords.some(keyword => 
        keyword.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get unique categories for filter dropdown
  const uniqueCategories = [...new Set(templates.map(t => t.category))].sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Laddar mallar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Transaktionsmallar
                {isDeveloper && (
                  <Badge variant="secondary" className="ml-2 gap-1">
                    <Crown className="h-3 w-3" />
                    Utvecklare
                  </Badge>
                )}
              </h1>
              <p className="text-gray-600 mt-1">
                Hantera och skapa mallar för återkommande transaktioner
                {isDeveloper && " • Systemmallar tillgängliga"}
              </p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Skapa mall
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Skapa ny transaktionsmall</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="template-name">Mallnamn</Label>
                      <Input
                        id="template-name"
                        value={newTemplate.template_name}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, template_name: e.target.value }))}
                        placeholder="t.ex. Månadsvis hyra"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Kategori</Label>
                      <Select
                        value={newTemplate.category}
                        onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Välj kategori" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Lokalkostnader">Lokalkostnader</SelectItem>
                          <SelectItem value="Fordonskostnader">Fordonskostnader</SelectItem>
                          <SelectItem value="Lön och personal">Lön och personal</SelectItem>
                          <SelectItem value="Skatter och avgifter">Skatter och avgifter</SelectItem>
                          <SelectItem value="Kontorskostnader">Kontorskostnader</SelectItem>
                          <SelectItem value="Försäkringar">Försäkringar</SelectItem>
                          <SelectItem value="Övrigt">Övrigt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Beskrivning</Label>
                    <Textarea
                      id="description"
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Beskriv vad denna mall används till..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="keywords">Nyckelord (kommaseparerat)</Label>
                    <Input
                      id="keywords"
                      value={newTemplate.keywords}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, keywords: e.target.value }))}
                      placeholder="hyra, lokaler, kontor"
                    />
                  </div>

                  {isDeveloper && (
                    <div className="flex items-center space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <input
                        type="checkbox"
                        id="is_system_template"
                        checked={newTemplate.is_system_template}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, is_system_template: e.target.checked }))}
                        className="rounded"
                      />
                      <Label htmlFor="is_system_template" className="text-orange-800 font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Systemtemplate (tillgänglig för alla användare)
                      </Label>
                    </div>
                  )}

                  <div>
                    <Label>Bokföringsposter</Label>
                    <div className="space-y-3 mt-2">
                       {newTemplate.template_entries.map((entry, index) => (
                          <div key={index} className="grid grid-cols-4 gap-2 p-3 border rounded-lg">
                            <AccountSelector
                              value={entry.account_code}
                              onValueChange={(accountCode, accountName) => {
                                const newEntries = [...newTemplate.template_entries];
                                newEntries[index].account_code = accountCode;
                                newEntries[index].account_name = accountName;
                                setNewTemplate(prev => ({ ...prev, template_entries: newEntries }));
                              }}
                              placeholder="Välj konto"
                            />
                            <Input
                              placeholder="Kontonamn"
                              value={entry.account_name}
                              disabled
                              className="bg-gray-100"
                            />
                           <Select
                             value={entry.type}
                             onValueChange={(value) => {
                               const newEntries = [...newTemplate.template_entries];
                               newEntries[index].type = value;
                               setNewTemplate(prev => ({ ...prev, template_entries: newEntries }));
                             }}
                           >
                             <SelectTrigger>
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="debit">Debet</SelectItem>
                               <SelectItem value="credit">Kredit</SelectItem>
                             </SelectContent>
                           </Select>
                           <Input
                             placeholder="Beskrivning"
                             value={entry.description}
                             onChange={(e) => {
                               const newEntries = [...newTemplate.template_entries];
                               newEntries[index].description = e.target.value;
                               setNewTemplate(prev => ({ ...prev, template_entries: newEntries }));
                             }}
                           />
                         </div>
                       ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setNewTemplate(prev => ({
                            ...prev,
                            template_entries: [
                              ...prev.template_entries,
                              { account_code: '', account_name: '', type: 'debit', description: '' }
                            ]
                          }));
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Lägg till post
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Avbryt
                    </Button>
                    <Button onClick={createTemplate}>
                      Skapa mall
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Redigera transaktionsmall</DialogTitle>
                </DialogHeader>
                {editingTemplate && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-template-name">Mallnamn</Label>
                        <Input
                          id="edit-template-name"
                          value={editingTemplate.template_name}
                          onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, template_name: e.target.value } : null)}
                          placeholder="t.ex. Månadsvis hyra"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-category">Kategori</Label>
                        <Select
                          value={editingTemplate.category}
                          onValueChange={(value) => setEditingTemplate(prev => prev ? { ...prev, category: value } : null)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Välj kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Lokalkostnader">Lokalkostnader</SelectItem>
                            <SelectItem value="Fordonskostnader">Fordonskostnader</SelectItem>
                            <SelectItem value="Lön och personal">Lön och personal</SelectItem>
                            <SelectItem value="Skatter och avgifter">Skatter och avgifter</SelectItem>
                            <SelectItem value="Kontorskostnader">Kontorskostnader</SelectItem>
                            <SelectItem value="Försäkringar">Försäkringar</SelectItem>
                            <SelectItem value="Övrigt">Övrigt</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-description">Beskrivning</Label>
                      <Textarea
                        id="edit-description"
                        value={editingTemplate.description}
                        onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, description: e.target.value } : null)}
                        placeholder="Beskriv vad denna mall används till..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-keywords">Nyckelord (kommaseparerat)</Label>
                      <Input
                        id="edit-keywords"
                        value={Array.isArray(editingTemplate.keywords) ? editingTemplate.keywords.join(', ') : ''}
                        onChange={(e) => setEditingTemplate(prev => prev ? { 
                          ...prev, 
                          keywords: e.target.value.split(',').map(k => k.trim()) 
                        } : null)}
                        placeholder="hyra, lokaler, kontor"
                      />
                    </div>

                    <div>
                      <Label>Bokföringsposter</Label>
                      <div className="space-y-3 mt-2">
                        {editingTemplate.template_entries.map((entry: any, index: number) => (
                           <div key={index} className="grid grid-cols-4 gap-2 p-3 border rounded-lg">
                             <AccountSelector
                               value={entry.account_code}
                               onValueChange={(accountCode, accountName) => {
                                 const newEntries = [...editingTemplate.template_entries];
                                 newEntries[index].account_code = accountCode;
                                 newEntries[index].account_name = accountName;
                                 setEditingTemplate(prev => prev ? { ...prev, template_entries: newEntries } : null);
                               }}
                               placeholder="Välj konto"
                             />
                             <Input
                               placeholder="Kontonamn"
                               value={entry.account_name}
                               disabled
                               className="bg-gray-100"
                             />
                            <Select
                              value={entry.type}
                              onValueChange={(value) => {
                                const newEntries = [...editingTemplate.template_entries];
                                newEntries[index].type = value;
                                setEditingTemplate(prev => prev ? { ...prev, template_entries: newEntries } : null);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="debit">Debet</SelectItem>
                                <SelectItem value="credit">Kredit</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="Beskrivning"
                              value={entry.description}
                              onChange={(e) => {
                                const newEntries = [...editingTemplate.template_entries];
                                newEntries[index].description = e.target.value;
                                setEditingTemplate(prev => prev ? { ...prev, template_entries: newEntries } : null);
                              }}
                            />
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingTemplate(prev => prev ? {
                              ...prev,
                              template_entries: [
                                ...prev.template_entries,
                                { account_code: '', account_name: '', type: 'debit', description: '' }
                              ]
                            } : null);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Lägg till post
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                        Avbryt
                      </Button>
                      <Button onClick={updateTemplate}>
                        Uppdatera mall
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Mallar
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Användningshistorik
            </TabsTrigger>
          </TabsList>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Sök mallar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Alla kategorier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla kategorier</SelectItem>
                  {uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            {filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="bg-white border border-gray-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg font-semibold text-gray-900">
                            {template.template_name}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                        </div>
                        {template.is_system_template && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                            <Shield className="h-3 w-3 mr-1" />
                            System
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Kategori:</span>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Användningar:</span>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{template.usage_count || 0}</span>
                        </div>
                      </div>

                      {template.last_used_at && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Senast använd:</span>
                          <span className="text-xs text-gray-500">
                            {formatDate(template.last_used_at)}
                          </span>
                        </div>
                      )}

                      {template.keywords && template.keywords.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-sm text-gray-600">Nyckelord:</span>
                          <div className="flex flex-wrap gap-1">
                            {template.keywords.map((keyword, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t">
                        <span className="text-sm text-gray-600 block mb-2">Bokföringsposter:</span>
                        <div className="space-y-1 text-xs">
                          {template.template_entries.map((entry: any, index: number) => (
                            <div key={index} className="flex justify-between">
                              <span>{entry.type === 'debit' ? 'D' : 'K'}: {entry.account_code}</span>
                              <span className="text-gray-500">{entry.account_name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {isDeveloper && template.is_system_template && (
                        <div className="pt-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditTemplate(template)}
                            className="w-full"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Redigera mall
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">Inga mallar hittades</p>
                <p className="text-sm mt-1">
                  {searchTerm || selectedCategory !== 'all' 
                    ? 'Prova att ändra sökkriterier eller filter' 
                    : 'Skapa din första mall för att komma igång'
                  }
                </p>
              </div>
            )}
          </TabsContent>

          {/* Usage History Tab */}
          <TabsContent value="usage" className="space-y-6">
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Senaste användningar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {templateUsage.length > 0 ? (
                  <div className="space-y-4">
                    {templateUsage.map((usage) => (
                      <div key={usage.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{usage.template_name}</p>
                            <p className="text-sm text-gray-500">{usage.transaction_description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {formatDate(usage.used_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Inga mallar har använts än</p>
                    <p className="text-sm mt-1">Mallar kommer att visas här när de används i bokföringen</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TemplateManager;