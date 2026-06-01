// ============================================================================
// VERIFICAR ESTRUTURA BÁSICA DA BASE DE DADOS
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

console.log('🔍 VERIFICANDO ESTRUTURA DA BASE DE DADOS...\n');

async function verificarEstrutura() {
  try {
    // 1. Verificar businesses
    console.log('1️⃣ VERIFICANDO BUSINESSES:');
    const businessResponse = await fetch(`${supabaseUrl}/rest/v1/businesses?select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (businessResponse.ok) {
      const businesses = await businessResponse.json();
      console.log(`   📊 Total: ${businesses.length} negócios`);
      businesses.forEach((business, i) => {
        console.log(`   ${i + 1}. ${business.name} (ID: ${business.id})`);
      });
    } else {
      console.log(`   ❌ Erro: ${businessResponse.status}`);
    }
    
    // 2. Verificar products
    console.log('\n2️⃣ VERIFICANDO PRODUCTS:');
    const productResponse = await fetch(`${supabaseUrl}/rest/v1/products?select=*&limit=5`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (productResponse.ok) {
      const products = await productResponse.json();
      console.log(`   📊 Total encontrado: ${products.length} produtos`);
      products.forEach((product, i) => {
        console.log(`   ${i + 1}. ${product.name} - ${product.price} AOA (Business: ${product.business_id})`);
      });
    } else {
      console.log(`   ❌ Erro: ${productResponse.status}`);
    }
    
    // 3. Verificar sales
    console.log('\n3️⃣ VERIFICANDO SALES:');
    const salesResponse = await fetch(`${supabaseUrl}/rest/v1/sales?select=*&limit=5`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (salesResponse.ok) {
      const sales = await salesResponse.json();
      console.log(`   📊 Total encontrado: ${sales.length} vendas`);
      sales.forEach((sale, i) => {
        const date = new Date(sale.created_at).toLocaleString('pt-BR');
        console.log(`   ${i + 1}. ${sale.total} AOA - ${date} (Business: ${sale.business_id})`);
      });
    } else {
      console.log(`   ❌ Erro: ${salesResponse.status}`);
    }
    
    // 4. Verificar business_users
    console.log('\n4️⃣ VERIFICANDO BUSINESS_USERS:');
    const usersResponse = await fetch(`${supabaseUrl}/rest/v1/business_users?select=*&limit=5`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      console.log(`   📊 Total encontrado: ${users.length} usuários`);
      users.forEach((user, i) => {
        console.log(`   ${i + 1}. User: ${user.user_id} - Business: ${user.business_id} - Role: ${user.role}`);
      });
    } else {
      console.log(`   ❌ Erro: ${usersResponse.status}`);
    }
    
    console.log('\n📋 RESUMO:');
    console.log('   - Se não há businesses: Execute o SQL inicial no Supabase');
    console.log('   - Se não há products: Crie produtos primeiro');
    console.log('   - Se não há sales: Normal, serão criadas quando fizer vendas');
    console.log('   - Se não há business_users: Faça login/registro primeiro');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

verificarEstrutura();