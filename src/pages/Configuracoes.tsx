import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Building, Palette, Users, Settings as SettingsIcon } from 'lucide-react';
import GestaoUsuarios from '@/components/configuracoes/GestaoUsuarios';
import { PageLayout } from '@/components/layout/PageLayout';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'empresa', label: 'Empresa', icon: Building },
  { id: 'personalizacao', label: 'Personalização', icon: Palette },
  { id: 'usuarios', label: 'Usuários', icon: Users },
  { id: 'parametros', label: 'Parâmetros', icon: SettingsIcon },
];

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState('empresa');

  return (
    <PageLayout
      title="Configurações"
      subtitle="Personalização e controle do sistema"
      icon={SettingsIcon}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="space-y-6">
        {activeTab === 'empresa' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
                  <Input id="nomeEmpresa" defaultValue="Ashby Cervejaria" className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" defaultValue="12.345.678/0001-90" className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="emailCorp">E-mail Corporativo</Label>
                  <Input id="emailCorp" type="email" defaultValue="contato@ashby.com.br" className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="telefoneCorp">Telefone</Label>
                  <Input id="telefoneCorp" defaultValue="(11) 3456-7890" className="mt-1.5 rounded-xl" />
                </div>
              </div>

              <div>
                <Label htmlFor="endereco">Endereço Completo</Label>
                <Input id="endereco" defaultValue="Rua das Cervejarias, 123 - São Paulo, SP" className="mt-1.5 rounded-xl" />
              </div>

              <Button variant="success" className="gap-2">
                <Save className="h-4 w-4" />
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === 'personalizacao' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personalização Visual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="corPrimaria">Cor Primária</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input id="corPrimaria" type="color" defaultValue="#3B82F6" className="w-20 h-10 rounded-xl" />
                    <Input defaultValue="#3B82F6" readOnly className="rounded-xl" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="corSecundaria">Cor Secundária</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input id="corSecundaria" type="color" defaultValue="#F59E0B" className="w-20 h-10 rounded-xl" />
                    <Input defaultValue="#F59E0B" readOnly className="rounded-xl" />
                  </div>
                </div>
              </div>

              <div className="border rounded-xl p-4 space-y-2">
                <p className="font-semibold text-sm">Preview das Cores</p>
                <div className="flex gap-2">
                  <div className="w-16 h-16 rounded-xl bg-primary shadow-lg" />
                  <div className="w-16 h-16 rounded-xl bg-secondary shadow-lg" />
                  <div className="w-16 h-16 rounded-xl bg-card border shadow-lg" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="success" className="gap-2">
                  <Save className="h-4 w-4" />
                  Aplicar Cores
                </Button>
                <Button variant="outline">
                  Resetar Padrão
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'usuarios' && <GestaoUsuarios />}

        {activeTab === 'parametros' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Parâmetros Globais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timezone">Fuso Horário</Label>
                  <Input id="timezone" defaultValue="America/Sao_Paulo" readOnly className="mt-1.5 rounded-xl bg-muted/50" />
                </div>
                <div>
                  <Label htmlFor="moeda">Moeda Padrão</Label>
                  <Input id="moeda" defaultValue="BRL - Real Brasileiro" readOnly className="mt-1.5 rounded-xl bg-muted/50" />
                </div>
              </div>

              <div>
                <Label htmlFor="emailNotif">E-mail para Notificações</Label>
                <Input id="emailNotif" type="email" defaultValue="suporte@ashby.com.br" className="mt-1.5 rounded-xl" />
              </div>

              <div>
                <Label htmlFor="webhookN8n">Webhook n8n (Automações)</Label>
                <Input
                  id="webhookN8n"
                  placeholder="https://seu-webhook-n8n.com"
                  className="mt-1.5 rounded-xl"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Configure o webhook para integrar com automações n8n
                </p>
              </div>

              <Button variant="success" className="gap-2">
                <Save className="h-4 w-4" />
                Salvar Parâmetros
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
