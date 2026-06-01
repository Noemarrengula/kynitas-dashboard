// Comandos ESC/POS para abrir gaveta
const CASH_DRAWER_COMMANDS = {
  // ESC p m t1 t2 - Comando padrão para gaveta
  PULSE_PIN_2: new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]), // Pino 2
  PULSE_PIN_5: new Uint8Array([0x1B, 0x70, 0x01, 0x19, 0xFA]), // Pino 5
};

export interface CashDrawerConfig {
  ip: string;
  port: number;
  pin?: 2 | 5;
}

export const openCashDrawer = async (config: CashDrawerConfig): Promise<boolean> => {
  try {
    const { ip, port, pin = 2 } = config;
    const command = pin === 5 ? CASH_DRAWER_COMMANDS.PULSE_PIN_5 : CASH_DRAWER_COMMANDS.PULSE_PIN_2;
    
    const response = await fetch(`http://${ip}:${port}/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: command,
    });

    return response.ok;
  } catch (error) {
    console.error('Erro ao abrir gaveta:', error);
    return false;
  }
};

export const testCashDrawer = async (config: CashDrawerConfig): Promise<boolean> => {
  return openCashDrawer(config);
};
