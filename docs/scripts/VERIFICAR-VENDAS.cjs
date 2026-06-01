// ============================================================================
// VERIFICAR VENDAS NO SUPABASE
// ============================================================================

const fs = require('fs');
const path = require('path');

let supabaseUrl, supabaseKey;

try {
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1];
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1];
    }
  });
} catch (err) {
  console.log('❌ Erro ao ler arquivo .env:', err.message);
  process.exit(1);
}

console.log('🔍 VERIFICANDO VENDAS NO SUPABASE...\n');

async function verificarVendas() {
  try {
    // 1. Verificar total de vendas
    const totalResponse = await fetch(`${supabaseUrl}/rest/v1/sales?select=count`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });
    
    const totalCount = totalResponse.headers.get('content-range');
    console.log('📊 TOTAL DE VENDAS:', totalCount || 'Não encontrado');
    
    // 2. Verificar últimas vendas
    const salesResponse = await fetch(`${supabaseUrl}/rest/v1/sales?select=*&order=created_at.desc&limit=10`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (salesResponse.ok) {
      const sales = await salesResponse.json();
      console.log(`\n📋 ÚLTIMAS ${sales.length} VENDAS:`);
      
      if (sales.length === 0) {
        console.log('❌ Nenhuma venda encontrada na base de dados');
      } else {
        sales.forEach((sale, index) => {
          const date = new Date(sale.created_at).toLocaleString('pt-BR');
          console.log(`${index + 1}. Venda #${sale.sale_number || sale.id} - ${sale.total} AOA - ${date}`);
        });
      }
    } else {
      console.log('❌ Erro ao carregar vendas:', salesResponse.status);
    }
    
    // 3. Verificar vendas por mês
    const monthlyResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/sales_by_month`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (monthlyResponse.ok) {
      const monthlyData = await monthlyResponse.json();
      console.log('\n📅 VENDAS POR MÊS:', monthlyData);
    }
    
    // 4. Verificar businesses
    const businessResponse = await fetch(`${supabaseUrl}/rest/v1/businesses?select=id,name&limit=5`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (businessResponse.ok) {
      const businesses = await businessResponse.json();
      console.log('\n🏢 NEGÓCIOS ENCONTRADOS:');
      businesses.forEach(business => {
        console.log(`- ${business.name} (ID: ${business.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

verificarVendas();