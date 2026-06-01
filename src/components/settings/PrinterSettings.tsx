import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { useThermalPrinter } from '@/hooks/useThermalPrinter';
import { Printer, TestTube } from 'lucide-react';

interface PrinterConfig {
  id?: string;
  printerName: string;
  printerType: string;
  charWidth: number;
  connectionType: string;
  ipAddress?: string;
  port?: number;
  isDefault: boolean;
  active: boolean;
}

export function PrinterSettings() {
  const { business } = useBusiness();
  const { testPrinter, isPrinting } = useThermalPrinter();
  const [config, setConfig] = useState<PrinterConfig>({
    printerName: 'Impressora Térmica',
    printerType: 'thermal',
    charWidth: 48,
    connectionType: 'usb',
    isDefault: true,
    active: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [business?.id]);

  const loadConfig = async () => {
    if (!business?.id) return;

    try {
      const { data, error } = await supabase
        .from('printer_settings')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_default', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setConfig({
          id: data.id,
          printerName: data.printer_name,
          printerType: data.printer_type,
          charWidth: data.char_width,
          connectionType: data.connection_type,
          ipAddress: data.ip_address,
          port: data.port,
          isDefault: data.is_default,
          active: data.active,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const saveConfig = async () => {
    if (!business?.id) return;

    setLoading(true);
    try {
      const payload = {
        business_id: business.id,
        printer_name: config.printerName,
        printer_type: config.printerType,
        char_width: config.charWidth,
        connection_type: config.connectionType,
        ip_address: config.ipAddress,
        port: config.port,
        is_default: config.isDefault,
        active: config.active,
      };

      if (config.id) {
        const { error } = await supabase
          .from('printer_settings')
          .update(payload)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('printer_settings')
          .insert(payload);

        if (error) throw error;
      }

      toast({
        title: 'Configuração salva',
        description: 'Configurações da impressora foram atualizadas',
      });

      loadConfig();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Configuração de Impressora
        </CardTitle>
        <CardDescription>
          Configure sua impressora térmica para impressão de recibos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="printerName">Nome da Impressora</Label>
          <Input
            id="printerName"
            value={config.printerName}
            onChange={(e) => setConfig({ ...config, printerName: e.target.value })}
            placeholder="Ex: XPrinter XP-80C"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="printerType">Tipo de Impressora</Label>
          <Select
            value={config.printerType}
            onValueChange={(value) => setConfig({ ...config, printerType: value })}
          >
            <SelectTrigger id="printerType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thermal">Térmica (80mm)</SelectItem>
              <SelectItem value="thermal-58">Térmica (58mm)</SelectItem>
              <SelectItem value="impact">Matricial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="charWidth">Largura (caracteres)</Label>
          <Select
            value={config.charWidth.toString()}
            onValueChange={(value) => setConfig({ ...config, charWidth: parseInt(value) })}
          >
            <SelectTrigger id="charWidth">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="32">32 caracteres (58mm)</SelectItem>
              <SelectItem value="48">48 caracteres (80mm)</SelectItem>
              <SelectItem value="42">42 caracteres (80mm compacto)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="connectionType">Tipo de Conexão</Label>
          <Select
            value={config.connectionType}
            onValueChange={(value) => setConfig({ ...config, connectionType: value })}
          >
            <SelectTrigger id="connectionType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="usb">USB</SelectItem>
              <SelectItem value="network">Rede (IP)</SelectItem>
              <SelectItem value="bluetooth">Bluetooth</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {config.connectionType === 'network' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="ipAddress">Endereço IP</Label>
              <Input
                id="ipAddress"
                value={config.ipAddress || ''}
                onChange={(e) => setConfig({ ...config, ipAddress: e.target.value })}
                placeholder="192.168.1.100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="port">Porta</Label>
              <Input
                id="port"
                type="number"
                value={config.port || 9100}
                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                placeholder="9100"
              />
            </div>
          </>
        )}

        <div className="flex items-center justify-between">
          <Label htmlFor="active">Impressora Ativa</Label>
          <Switch
            id="active"
            checked={config.active}
            onCheckedChange={(checked) => setConfig({ ...config, active: checked })}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={saveConfig} disabled={loading} className="flex-1">
            {loading ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
          <Button
            variant="outline"
            onClick={testPrinter}
            disabled={isPrinting}
            className="flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            {isPrinting ? 'Testando...' : 'Testar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
