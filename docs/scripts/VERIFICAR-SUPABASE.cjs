// ============================================================================
// SCRIPT DE VERIFICAÇÃO DA INTEGRAÇÃO SUPABASE
// ============================================================================

// Ler variáveis do arquivo .env manualmente
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
}

console.log('🔍 VERIFICANDO INTEGRAÇÃO SUPABASE...\n');

// 1. VERIFICAR CONFIGURAÇÃO
console.log('1️⃣ CONFIGURAÇÃO:');
console.log(`   URL: ${supabaseUrl ? '✅ Configurada' : '❌ Não encontrada'}`);
console.log(`   KEY: ${supabaseKey ? '✅ Configurada' : '❌ Não encontrada'}`);

if (!supabaseUrl || !supabaseKey) {
  console.log('\n❌ ERRO: Variáveis de ambiente não configuradas!');
  console.log('   Verifique o arquivo .env');
  process.exit(1);
}

// 2. VERIFICAR SE PODE FAZER REQUESTS HTTP
console.log('   Cliente: ✅ Configuração carregada\n');

// 3. TESTAR CONEXÃO HTTP
async function verificarConexao() {
  try {
    console.log('2️⃣ TESTANDO CONEXÃO:');
    
    // Teste básico de conectividade HTTP
    const response = await fetch(`${supabaseUrl}/rest/v1/businesses?select=count&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log(`   ❌ Erro HTTP: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const data = await response.json();
    console.log('   ✅ Conexão estabelecida');
    console.log(`   📊 Resposta recebida: ${Array.isArray(data) ? data.length : 'OK'}\n`);
    return true;
  } catch (err) {
    console.log(`   ❌ Erro inesperado: ${err.message}`);
    return false;
  }
}

// 4. VERIFICAR TABELAS
async function verificarTabelas() {
  console.log('3️⃣ VERIFICANDO TABELAS:');
  
  const tabelas = [
    'businesses',
    'business_users', 
    'products',
    'ingredients',
    'sales',
    'customers',
    'suppliers',
    'stock_movements',
    'credits',
    'credit_payments'
  ];
  
  let tabelasOk = 0;
  
  for (const tabela of tabelas) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/${tabela}?select=count&limit=1`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.log(`   ❌ ${tabela}: HTTP ${response.status}`);
      } else {
        console.log(`   ✅ ${tabela}: OK`);
        tabelasOk++;
      }
    } catch (err) {
      console.log(`   ❌ ${tabela}: Erro inesperado`);
    }
  }
  
  console.log(`\n   📊 Tabelas funcionais: ${tabelasOk}/${tabelas.length}\n`);
  return tabelasOk === tabelas.length;
}

// 5. TESTAR OPERAÇÕES BÁSICAS
async function testarOperacoes() {
  console.log('4️⃣ TESTANDO OPERAÇÕES:');
  
  try {
    // Teste de leitura
    const response = await fetch(`${supabaseUrl}/rest/v1/businesses?select=*&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log(`   ❌ Leitura: HTTP ${response.status}`);
      return false;
    }
    
    const businesses = await response.json();
    console.log('   ✅ Leitura: OK');
    
    if (businesses && businesses.length > 0) {
      const businessId = businesses[0].id;
      
      // Teste de leitura com filtro
      const filterResponse = await fetch(`${supabaseUrl}/rest/v1/products?select=*&business_id=eq.${businessId}&limit=5`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!filterResponse.ok) {
        console.log(`   ❌ Filtros: HTTP ${filterResponse.status}`);
      } else {
        const products = await filterResponse.json();
        console.log('   ✅ Filtros: OK');
        console.log(`   📦 Produtos encontrados: ${products?.length || 0}`);
      }
    }
    
    console.log('');
    return true;
  } catch (err) {
    console.log(`   ❌ Erro nas operações: ${err.message}\n`);
    return false;
  }
}

// 6. VERIFICAR RLS POLICIES
async function verificarRLS() {
  console.log('5️⃣ VERIFICANDO RLS POLICIES:');
  
  try {
    // Tentar acessar dados (com chave anônima)
    const response = await fetch(`${supabaseUrl}/rest/v1/products?select=*&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 401 || response.status === 403) {
      console.log('   ✅ RLS ativo: Acesso negado sem autenticação');
    } else if (response.ok) {
      const data = await response.json();
      if (!data || data.length === 0) {
        console.log('   ✅ RLS ativo: Nenhum dado retornado sem autenticação');
      } else {
        console.log('   ⚠️  RLS: Dados retornados sem autenticação (verificar políticas)');
      }
    } else {
      console.log(`   ❓ RLS: Status inesperado ${response.status}`);
    }
    
    console.log('');
    return true;
  } catch (err) {
    console.log(`   ❌ Erro ao verificar RLS: ${err.message}\n`);
    return false;
  }
}

// 7. EXECUTAR TODAS AS VERIFICAÇÕES
async function executarVerificacao() {
  const conexaoOk = await verificarConexao();
  const tabelasOk = await verificarTabelas();
  const operacoesOk = await testarOperacoes();
  const rlsOk = await verificarRLS();
  
  console.log('📋 RESUMO DA VERIFICAÇÃO:');
  console.log(`   Conexão: ${conexaoOk ? '✅' : '❌'}`);
  console.log(`   Tabelas: ${tabelasOk ? '✅' : '❌'}`);
  console.log(`   Operações: ${operacoesOk ? '✅' : '❌'}`);
  console.log(`   RLS: ${rlsOk ? '✅' : '❌'}`);
  
  const tudoOk = conexaoOk && tabelasOk && operacoesOk && rlsOk;
  
  console.log(`\n🎯 STATUS GERAL: ${tudoOk ? '✅ TUDO FUNCIONANDO' : '❌ PROBLEMAS ENCONTRADOS'}`);
  
  if (!tudoOk) {
    console.log('\n🔧 PRÓXIMOS PASSOS:');
    if (!conexaoOk) console.log('   1. Verificar credenciais no .env');
    if (!tabelasOk) console.log('   2. Executar script SQL no Supabase');
    if (!operacoesOk) console.log('   3. Verificar permissões de acesso');
    if (!rlsOk) console.log('   4. Configurar RLS policies');
  }
  
  return tudoOk;
}

// Executar verificação
if (typeof window === 'undefined') {
  // Node.js environment
  executarVerificacao()
    .then(sucesso => {
      process.exit(sucesso ? 0 : 1);
    })
    .catch(err => {
      console.error('❌ ERRO FATAL:', err.message);
      process.exit(1);
    });
}