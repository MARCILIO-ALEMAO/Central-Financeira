const API_URL = 'https://script.google.com/macros/s/AKfycbxn-dylgW67tQWbSL2MhkoaERR3EMBIA-tOVXwTLwrP0Y0PK02jG6KK8n9VryIZf-3jdQ/exec';
let db = {};

window.onload = function () {
    const buttonDiv = document.getElementById("buttonDiv");
    buttonDiv.innerHTML = `
        <button onclick="handleCredentialResponse()" class="bg-white text-slate-800 font-medium py-2 px-4 rounded flex items-center gap-2 hover:bg-slate-100 transition w-full justify-center">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-5 h-5" alt="Google">
            Entrar com Google
        </button>
    `;

    // Seta a data de hoje como padrão no modal
    document.getElementById('mov-data').valueAsDate = new Date();
    
    // Intercepta o envio do formulário
    document.getElementById('form-movimentacao').addEventListener('submit', salvarMovimentacao);
};

async function handleCredentialResponse() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('loading-screen').classList.remove('hidden');
    await fetchAllData();
}

function logout() {
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    db = {};
}

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const formatDate = (dateString) => {
    if (!dateString) return '-';
    // Corrige problema de fuso horário ao exibir data
    const date = new Date(dateString + 'T12:00:00');
    return new Intl.DateTimeFormat('pt-BR').format(date);
};

async function fetchAllData() {
    try {
        const response = await fetch(`${API_URL}?action=getAllData&email=marcilio@example.com`);
        const result = await response.json();
        
        if (result.status === 'success') {
            db = result.data;
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('app-screen').classList.remove('hidden');
            renderDashboard();
        } else {
            alert('Erro: ' + result.message);
            logout();
        }
    } catch (error) {
        alert('Falha na conexão.');
        logout();
    }
}

function renderDashboard() {
    const saldoTotal = db.contas.reduce((acc, conta) => acc + (parseFloat(conta.saldo_atual) || 0), 0);
    const invTotal = db.investimentos.reduce((acc, inv) => acc + (parseFloat(inv.valor_atual) || 0), 0);
    const cartoesTotal = db.cartoes.reduce((acc, cartao) => acc + (parseFloat(cartao.limite_utilizado) || 0), 0);
    const patrimonioLiquido = saldoTotal + invTotal - cartoesTotal;

    document.getElementById('card-saldo').innerText = formatCurrency(saldoTotal);
    document.getElementById('card-investimentos').innerText = formatCurrency(invTotal);
    document.getElementById('card-cartoes').innerText = formatCurrency(cartoesTotal);
    document.getElementById('card-patrimonio').innerText = formatCurrency(patrimonioLiquido);

    const tabelaMov = document.getElementById('tabela-movimentacoes');
    tabelaMov.innerHTML = '';

    const ultimasMovs = db.movimentacoes.slice(-5).reverse();
    if (ultimasMovs.length === 0) {
        tabelaMov.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-500">Nenhuma movimentação encontrada.</td></tr>';
        return;
    }

    ultimasMovs.forEach(mov => {
        const isEntrada = mov.tipo === 'Entrada';
        const corValor = isEntrada ? 'text-emerald-400' : 'text-red-400';
        const sinal = isEntrada ? '+' : '-';

        const row = `
            <tr class="hover:bg-slate-800/30 transition-colors">
                <td class="p-4 text-slate-300">${formatDate(mov.data)}</td>
                <td class="p-4 text-white font-medium">${mov.descricao}</td>
                <td class="p-4"><span class="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">${mov.categoria}</span></td>
                <td class="p-4 text-right font-bold ${corValor}">${sinal} ${formatCurrency(mov.valor)}</td>
            </tr>
        `;
        tabelaMov.insertAdjacentHTML('beforeend', row);
    });
}

// === CONTROLE DO MODAL ===
function abrirModalMovimentacao() {
    document.getElementById('modal-movimentacao').classList.remove('hidden');
}

function fecharModalMovimentacao() {
    document.getElementById('modal-movimentacao').classList.add('hidden');
    document.getElementById('form-movimentacao').reset();
    document.getElementById('mov-data').valueAsDate = new Date();
}

// === SALVAR NO BANCO DE DADOS ===
async function salvarMovimentacao(event) {
    event.preventDefault(); // Evita recarregar a página
    
    const btnSalvar = document.getElementById('btn-salvar');
    btnSalvar.innerHTML = '<i class="ph ph-spinner-gap animate-spin text-xl"></i> Salvando...';
    btnSalvar.disabled = true;

    // Coleta os dados do formulário
    const novaMovimentacao = {
        id_movimentacao: 'MOV' + Date.now(), // Gera um ID único simples
        id_usuario: 'USR001',
        id_conta: 'CTA001', // Por enquanto fixo na conta 1
        id_cartao: '',
        tipo: document.getElementById('mov-tipo').value,
        categoria: document.getElementById('mov-categoria').value,
        valor: parseFloat(document.getElementById('mov-valor').value),
        data: document.getElementById('mov-data').value,
        descricao: document.getElementById('mov-descricao').value,
        id_documento: ''
    };

    const payload = {
        action: 'insertRow',
        sheet: 'Movimentacoes',
        email: 'marcilio@example.com',
        data: novaMovimentacao
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.status === 'success') {
            // Atualiza o banco de dados local para exibir a mudança imediatamente
            db.movimentacoes.push(novaMovimentacao);
            
            // Simula impacto no saldo da conta 1
            const conta = db.contas.find(c => c.id_conta === 'CTA001');
            if (conta) {
                if (novaMovimentacao.tipo === 'Entrada') conta.saldo_atual = parseFloat(conta.saldo_atual) + novaMovimentacao.valor;
                else conta.saldo_atual = parseFloat(conta.saldo_atual) - novaMovimentacao.valor;
            }

            renderDashboard();
            fecharModalMovimentacao();
        } else {
            alert('Erro ao salvar: ' + result.message);
        }
    } catch (error) {
        console.error(error);
        alert('Falha ao enviar dados para a nuvem.');
    } finally {
        btnSalvar.innerHTML = 'Salvar Registro';
        btnSalvar.disabled = false;
    }
}
