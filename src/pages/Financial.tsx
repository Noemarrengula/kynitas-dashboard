import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountsPayableTab } from '@/components/financial/AccountsPayableTab';
import { DRETab } from '@/components/financial/DRETab';
import { useI18n } from '@/contexts/I18nContext';

export default function Financial() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('nav.financial')}</h1>
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
