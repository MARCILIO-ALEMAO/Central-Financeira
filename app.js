// URL da sua API no Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbxn-dylgW67tQWbSL2MhkoaERR3EMBIA-tOVXwTLwrP0Y0PK02jG6KK8n9VryIZf-3jdQ/exec';

// Variável global para armazenar o banco de dados temporariamente no navegador
let db = {};

window.onload = function () {
    const buttonDiv = document.getElementById("buttonDiv");
    buttonDiv.innerHTML = `
        <button onclick="handleCredentialResponse()" class="bg-white text-slate-800 font-medium py-2 px-4 rounded flex items-center gap-2 hover:bg-slate-100 transition w-full justify-center">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-5 h-5" alt="Google">
            Entrar com Google
        </button>
    `;
};

async function handleCredentialResponse() {
    // Esconde tela de login e mostra a tela de carregamento
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('loading-screen').classList.remove('hidden');
    
    // Inicia o download de todos os dados do painel
    await fetchAllData();
}

function logout() {
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    db = {}; // Limpa os dados em memória
}

// Formatador de Moeda (BRL)
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

// Formatador de Data
const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR').format(date);
};

// Busca todos os dados em uma única requisição
async function fetchAllData() {
    try {
        const response = await fetch(`${API_URL}?action=getAllData&email=marcilio@example.com`);
        const result = await response.json();
        
        if (result.status === 'success') {
            db = result.data;
            console.log("Banco de dados sincronizado:", db);
            
            // Oculta loading e exibe a aplicação principal
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('app-screen').classList.remove('hidden');
            
            // Renderiza os componentes da tela
            renderDashboard();
        } else {
            alert('Erro ao carregar dados: ' + result.message);
            logout();
        }
    } catch (error) {
        console.error("Erro de conexão:", error);
        alert('Falha na conexão com o servidor.');
        logout();
    }
}

// Calcula os totais e preenche o HTML
function renderDashboard() {
    // 1. Calcula Saldo das Contas Bancárias
    const saldoTotal = db.contas.reduce((acc, conta) => acc + (parseFloat(conta.saldo_atual) || 0), 0);
    
    // 2. Calcula Total em Investimentos
    const invTotal = db.investimentos.reduce((acc, inv) => acc + (parseFloat(inv.valor_atual) || 0), 0);
    
    // 3. Calcula Faturas de Cartão (Limite Utilizado)
    const cartoesTotal = db.cartoes.reduce((acc, cartao) => acc + (parseFloat(cartao.limite_utilizado) || 0), 0);
    
    // 4. Patrimônio Líquido (Saldo + Investimentos - Faturas)
    const patrimonioLiquido = saldoTotal + invTotal - cartoesTotal;

    // Atualiza os cards no HTML
    document.getElementById('card-saldo').innerText = formatCurrency(saldoTotal);
    document.getElementById('card-investimentos').innerText = formatCurrency(invTotal);
    document.getElementById('card-cartoes').innerText = formatCurrency(cartoesTotal);
    document.getElementById('card-patrimonio').innerText = formatCurrency(patrimonioLiquido);

    // 5. Preenche a tabela de Últimas Movimentações
    const tabelaMov = document.getElementById('tabela-movimentacoes');
    tabelaMov.innerHTML = '';

    // Pega as últimas 5 movimentações e inverte a ordem (mais recentes primeiro)
    const ultimasMovs = db.movimentacoes.slice(-5).reverse();

    ultimasMovs.forEach(mov => {
        const isEntrada = mov.tipo === 'Entrada';
        const corValor = isEntrada ? 'text-emerald-400' : 'text-red-400';
        const sinal = isEntrada ? '+' : '-';

        const row = `
            <tr class="hover:bg-slate-800/30 transition-colors">
                <td class="p-4 text-slate-300">${formatDate(mov.data)}</td>
                <td class="p-4 text-white font-medium">${mov.descricao}</td>
                <td class="p-4">
                    <span class="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">${mov.categoria}</span>
                </td>
                <td class="p-4 text-right font-bold ${corValor}">
                    ${sinal} ${formatCurrency(mov.valor)}
                </td>
            </tr>
        `;
        tabelaMov.insertAdjacentHTML('beforeend', row);
    });
}
