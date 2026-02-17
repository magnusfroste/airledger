import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, FileText, List, Users, MessageSquare, AlertTriangle, Plug, Search } from 'lucide-react';
import AdminTemplates from '@/components/admin/AdminTemplates';
import AdminAccounts from '@/components/admin/AdminAccounts';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminPrompt from '@/components/admin/AdminPrompt';
import AdminWarningRules from '@/components/admin/AdminWarningRules';
import AdminIntegrations from '@/components/admin/AdminIntegrations';
import AdminSEO from '@/components/admin/AdminSEO';

const Admin = () => {
  const { isAdmin, loading } = useAdminRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/chat');
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin</h1>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="templates" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Mallar</span>
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Regler</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Kontoplan</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Användare</span>
          </TabsTrigger>
          <TabsTrigger value="prompt" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">AI-prompt</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">Integrationer</span>
          </TabsTrigger>
          <TabsTrigger value="seo" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">SEO/AEO</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <AdminTemplates />
        </TabsContent>
        <TabsContent value="rules">
          <AdminWarningRules />
        </TabsContent>
        <TabsContent value="accounts">
          <AdminAccounts />
        </TabsContent>
        <TabsContent value="users">
          <AdminUsers />
        </TabsContent>
        <TabsContent value="prompt">
          <AdminPrompt />
        </TabsContent>
        <TabsContent value="integrations">
          <AdminIntegrations />
        </TabsContent>
        <TabsContent value="seo">
          <AdminSEO />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
