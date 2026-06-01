// ============================================================================
// INSERIR VENDAS DE EXEMPLO VIA API
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

console.log('🔄 INSERINDO VENDAS DE EXEMPLO...\n');

async function inserirVendasExemplo() {
  try {
    // 1. Buscar business e produto
    const businessResponse = await fetch(`${supabaseUrl}/rest/v1/businesses?select=id&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const businesses = await businessResponse.json();
    if (!businesses || businesses.length === 0) {
      console.log('❌ Nenhum negócio encontrado');
      return;
    }
    
    const businessId = businesses[0].id;
    console.log('✅ Business ID:', businessId);
    
    // 2. Buscar produto
    const productResponse = await fetch(`${supabaseUrl}/rest/v1/products?select=id,price&business_id=eq.${businessId}&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const products = await productResponse.json();
    if (!products || products.length === 0) {
      console.log('❌ Nenhum produto encontrado para este negócio');
      return;
    }
    
    const product = products[0];
    console.log('✅ Produto ID:', product.id, 'Preço:', product.price);
    
    // 3. Inserir vendas de exemplo
    const vendasExemplo = [
      {
        business_id: businessId,
        items: [
          {
            productId: product.id,
            quantity: 2,
            subtotal: product.price * 2
          }
        ],
        total: product.price * 2,
        payment_details: {
          cash: product.price * 2,
          mpesa: 0,
          emola: 0,
          card: 0,
          total: product.price * 2,
          change: 0
        },
        created_at: '2024-01-15T10:30:00Z'
      },
      {
        business_id: businessId,
        items: [
          {
            productId: product.id,
            quantity: 1,
            subtotal: product.price
          }
        ],
        total: product.price,
        payment_details: {
          cash: 0,
          mpesa: product.price,
          emola: 0,
          card: 0,
          total: product.price,
          change: 0
        },
        created_at: '2024-02-20T14:15:00Z'
      },
      {
        business_id: businessId,
        items: [
          {
            productId: product.id,
            quantity: 3,
            subtotal: product.price * 3
          }
        ],
        total: product.price * 3,
        payment_details: {
          cash: product.price,
          mpesa: 0,
          emola: product.price * 2,
          card: 0,
          total: product.price * 3,
          change: 0
        },
        created_at: '2024-03-10T16:45:00Z'
      },
      {
        business_id: businessId,
        items: [
          {
            productId: product.id,
            quantity: 1,
            subtotal: product.price
          }
        ],
        total: product.price,
        payment_details: {
          cash: 0,
          mpesa: 0,
          emola: 0,
          card: product.price,
          total: product.price,
          change: 0
        },
        created_at: new Date().toISOString()
      }
    ];
    
    // 4. Inserir cada venda
    for (let i = 0; i < vendasExemplo.length; i++) {
      const venda = vendasExemplo[i];
      
      const response = await fetch(`${supabaseUrl}/rest/v1/sales`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(venda)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Venda ${i + 1} inserida:`, result[0]?.id, '-', venda.total, 'AOA');
      } else {
        const error = await response.text();
        console.log(`❌ Erro ao inserir venda ${i + 1}:`, response.status, error);
      }
    }
    
    // 5. Verificar vendas inseridas
    console.log('\n📊 VERIFICANDO VENDAS INSERIDAS...');
    
    const checkResponse = await fetch(`${supabaseUrl}/rest/v1/sales?select=*&business_id=eq.${businessId}&order=created_at.desc`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (checkResponse.ok) {
      const allSales = await checkResponse.json();
      console.log(`✅ Total de vendas na base: ${allSales.length}`);
      
      allSales.forEach((sale, index) => {
        const date = new Date(sale.created_at).toLocaleString('pt-BR');
        console.log(`${index + 1}. ${sale.total} AOA - ${date}`);
      });
    }
    
    console.log('\n🎉 VENDAS DE EXEMPLO INSERIDAS COM SUCESSO!');
    console.log('💡 Agora recarregue o dashboard e vá para Relatórios');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

inserirVendasExemplo();