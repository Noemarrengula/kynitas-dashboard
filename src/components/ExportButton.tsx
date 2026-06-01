import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { exportToExcel, exportToCSV } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';

interface ExportButtonProps {
  data: any[];
  filename: string;
  formatData?: (data: any[]) => any[];
  disabled?: boolean;
}

export function ExportButton({ data, filename, formatData, disabled }: ExportButtonProps) {
  const { toast } = useToast();

  const handleExport = (format: 'excel' | 'csv') => {
    try {
      const formattedData = formatData ? formatData(data) : data;
      
      if (formattedData.length === 0) {
        toast({
          title: "Sem dados para exportar",
          description: "Não há dados disponíveis para exportação.",
          variant: "destructive",
        });
        return;
      }

      if (format === 'excel') {
        exportToExcel(formattedData, filename);
      } else {
        exportToCSV(formattedData, filename);
      }

      toast({
        title: "Exportação concluída",
        description: `Arquivo ${filename}.${format === 'excel' ? 'xlsx' : 'csv'} baixado com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Ocorreu um erro durante a exportação.",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || data.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('excel')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileText className="mr-2 h-4 w-4" />
          CSV (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
