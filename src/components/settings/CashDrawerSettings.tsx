import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCashDrawer } from '@/hooks/useCashDrawer';
import { DollarSign } from 'lucide-react';

export const CashDrawerSettings = () => {
  const { test, saveConfig, getConfig, isOpening } = useCashDrawer();
  const [ip, setIp] = useState('192.168.1.100');
  const [port, setPort] = useState('9100');
  const [pin, setPin] = useState<'2' | '5'>('2');

  useEffect(() => {
    const config = getConfig();
    if (config) {
      setIp(config.ip);
      setPort(config.port.toString());
      setPin(config.pin?.toString() as '2' | '5' || '2');
    }
  }, []);

  const handleSave = () => {
    saveConfig({
      ip,
      port: parseInt(port),
      pin: parseInt(pin) as 2 | 5,
    });
  };

  const handleTest = async () => {
    await test({
      ip,
      port: parseInt(port),
      pin: parseInt(pin) as 2 | 5,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Gaveta de Dinheiro (Cash Drawer)
        </CardTitle>
        <CardDescription>
          Configure a gaveta conectada via cabo Ethernet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ip">Endereço IP</Label>
            <Input
              id="ip"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="192.168.1.100"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="port">Porta</Label>
            <Input
              id="port"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="9100"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pin">Pino de Controle</Label>
            <select
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value as '2' | '5')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="2">Pino 2 (Padrão)</option>
              <option value="5">Pino 5</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">
            Salvar Configuração
          </Button>
          <Button onClick={handleTest} variant="outline" disabled={isOpening}>
            {isOpening ? 'Testando...' : 'Testar Gaveta'}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p>• A gaveta abre automaticamente ao finalizar vendas em dinheiro</p>
          <p>• Certifique-se que a gaveta está conectada à rede</p>
          <p>• Porta padrão ESC/POS: 9100</p>
        </div>
      </CardContent>
    </Card>
  );
};
