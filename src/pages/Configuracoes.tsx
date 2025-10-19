import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Building, Palette, Users, Settings as SettingsIcon } from 'lucide-react';

export default function Configuracoes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Personalização e Controle do Sistema</p>
      </div>

      <Tabs defaultValue="empresa" className="space-y-4">
        <TabsList>
          <TabsTrigger value="empresa" className="gap-2">
            <Building className="h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="personalizacao" className="gap-2">
            <Palette className="h-4 w-4" />
            Personalização
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="parametros" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            Parâmetros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
                  <Input id="nomeEmpresa" defaultValue="Ashby Cervejaria" />
                </div>
                <div>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" defaultValue="12.345.678/0001-90" />
                </div>
                <div>
                  <Label htmlFor="emailCorp">E-mail Corporativo</Label>
                  <Input id="emailCorp" type="email" defaultValue="contato@ashby.com.br" />
                </div>
                <div>
                  <Label htmlFor="telefoneCorp">Telefone</Label>
                  <Input id="telefoneCorp" defaultValue="(11) 3456-7890" />
                </div>
              </div>

              <div>
                <Label htmlFor="endereco">Endereço Completo</Label>
                <Input id="endereco" defaultValue="Rua das Cervejarias, 123 - São Paulo, SP" />
              </div>

              <Button>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personalizacao">
          <Card>
            <CardHeader>
              <CardTitle>Personalização Visual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="corPrimaria">Cor Primária (Azul)</Label>
                  <div className="flex gap-2">
                    <Input id="corPrimaria" type="color" defaultValue="#3B82F6" className="w-20" />
                    <Input defaultValue="#3B82F6" readOnly />
                  </div>
                </div>
                <div>
                  <Label htmlFor="corSecundaria">Cor Secundária (Dourado)</Label>
                  <div className="flex gap-2">
                    <Input id="corSecundaria" type="color" defaultValue="#F59E0B" className="w-20" />
                    <Input defaultValue="#F59E0B" readOnly />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-2">
                <p className="font-semibold">Preview das Cores</p>
                <div className="flex gap-2">
                  <div className="w-20 h-20 rounded-lg bg-primary" />
                  <div className="w-20 h-20 rounded-lg bg-secondary" />
                  <div className="w-20 h-20 rounded-lg bg-card" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Aplicar Cores
                </Button>
                <Button variant="outline">
                  Resetar Padrão Ashby
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Usuários e Permissões</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Gestão de usuários será habilitada após configuração de autenticação</p>
                <Button className="mt-4" variant="outline">
                  Configurar Autenticação
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parametros">
          <Card>
            <CardHeader>
              <CardTitle>Parâmetros Globais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timezone">Fuso Horário</Label>
                  <Input id="timezone" defaultValue="America/Sao_Paulo" readOnly />
                </div>
                <div>
                  <Label htmlFor="moeda">Moeda Padrão</Label>
                  <Input id="moeda" defaultValue="BRL - Real Brasileiro" readOnly />
                </div>
              </div>

              <div>
                <Label htmlFor="emailNotif">E-mail para Notificações</Label>
                <Input id="emailNotif" type="email" defaultValue="suporte@ashby.com.br" />
              </div>

              <div>
                <Label htmlFor="webhookN8n">Webhook n8n (Automações)</Label>
                <Input
                  id="webhookN8n"
                  placeholder="https://seu-webhook-n8n.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Configure o webhook para integrar com automações n8n
                </p>
              </div>

              <Button>
                <Save className="h-4 w-4 mr-2" />
                Salvar Parâmetros
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
