import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountsPayableTab } from '@/components/financial/AccountsPayableTab';
import { DRETab } from '@/components/financial/DRETab';

export default function Financial() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground">Gestão financeira do estabelecimento</p>
      </div>

      <Tabs defaultValue="dre" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="payable">Contas a Pagar</TabsTrigger>
        </TabsList>

        <TabsContent value="dre">
          <DRETab />
        </TabsContent>

        <TabsContent value="payable">
          <AccountsPayableTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
