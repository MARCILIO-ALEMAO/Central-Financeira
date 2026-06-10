const API_URL = 'https://script.google.com/macros/s/AKfycbzJZCXIiEWxDmGoSzyz6IZ7LadFOb29kvZJkrivZUbFlcJYWn6o6_OL1P3h5l9jgm3qKA/exec';
let db = {};

window.onload = function () {
    const buttonDiv = document.getElementById("buttonDiv");
    if(buttonDiv) {
        buttonDiv.innerHTML = `
            <button onclick="handleCredentialResponse()" class="bg-white text-slate-800 font-medium py-2 px-4 rounded flex items-center gap-2 hover:bg-slate-100 transition w-full justify-center">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-5 h-5" alt="Google">
                Entrar com Google
            </button>
        `;
    }

    const movDataInput = document.getElementById('mov-data');
    if (movDataInput) movDataInput.valueAsDate = new Date();
    
    const formMovimentacao = document.getElementById('form-movimentacao');
    if (formMovimentacao) formMovimentacao.addEventListener('submit', salvarMovimentacao);
    
    const formAporte = document.getElementById('form-aporte');
    if (formAporte) formAporte.addEventListener('submit', salvarAporte);
};

// === SISTEMA DE NAVEGAÇÃO SPA ===
function changeScreen(screenId) {
    // 1. Esconde todas as telas
    const screens = document.querySelectorAll('.screen-content');
    screens.forEach(screen => screen.classList.remove('active'));

    // 2. Mostra a tela alvo
    const targetScreen = document.getElementById(`screen-${screenId}`);
    if (targetScreen) targetScreen.classList.add('active');

    // 3. Atualiza os estilos dos botões no menu
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        if (btn.dataset.target === screenId) {
            btn.className = "nav-btn w-full flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-lg transition";
        } else {
            btn.className = "nav-btn w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition";
        }
    });
}

// === AUTENTICAÇÃO E DADOS ===
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
    const shortDate = String(dateString).substring(0, 10);
    const date = new Date(shortDate + 'T12:00:00');
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

// === RENDERIZAÇÃO ===
function renderDashboard() {
    // Inicialização de segurança para evitar erros caso os dados venham vazios
    db.contas = db.contas || [];
    db.investimentos = db.investimentos || [];
    db.cartoes = db.cartoes || [];
    db.contasPagar = db.contasPagar || []; 

    // 1. Cálculos base
    const saldoTotal = db.contas.reduce((acc, c) => acc + (parseFloat(c.saldo_atual) || 0), 0);
    const patrimonioLiquido = saldoTotal + db.investimentos.reduce((acc, i) => acc + (parseFloat(i.valor_atual) || 0), 0) - db.cartoes.reduce((acc, c) => acc + (parseFloat(c.limite_utilizado) || 0), 0);

    // 2. Dashboard Geral (Cards)
    const cardSaldo = document.getElementById('card-saldo');
    if(cardSaldo) cardSaldo.innerText = formatCurrency(saldoTotal);
    
    const cardPatrimonio = document.getElementById('card-patrimonio');
    if(cardPatrimonio) cardPatrimonio.innerText = formatCurrency(patrimonioLiquido);

    // 3. Renderiza Contas a Pagar (Tela Pagamentos)
    const containerPag = document.getElementById('tabela-contas-pagar');
    if(containerPag) {
        containerPag.innerHTML = db.contasPagar.map(c => `
            <div class="flex justify-between items-center py-3 border-b border-slate-700">
                <div><p class="text-white">${c.descricao}</p><p class="text-xs text-slate-400">${formatDate(c.data_vencimento)}</p></div>
                <div class="flex items-center gap-4">
                    <span class="text-red-400 font-bold">${formatCurrency(c.valor)}</span>
                    <button onclick="pagarConta('${c.id_conta_pagar}')" class="bg-emerald-600 px-3 py-1 rounded text-xs font-bold text-white">Pagar</button>
                </div>
            </div>
        `).join('');
    }

    // 4. Renderiza Cartões (Tela Cartões)
    const containerCartoes = document.getElementById('lista-cartoes-detalhada');
    if(containerCartoes) {
        containerCartoes.innerHTML = db.cartoes.map(c => `
            <div class="bg-card p-6 rounded-xl border border-slate-700">
                <h4 class="text-white font-bold">${c.nome_cartao}</h4>
                <p class="text-sm text-slate-400">Limite: ${formatCurrency(c.limite)}</p>
                <div class="mt-4 bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div class="bg-blue-500 h-2" style="width: ${(c.limite_utilizado / c.limite) * 100}%"></div>
                </div>
                <p class="text-right text-red-400 font-bold mt-2">${formatCurrency(c.limite_utilizado)}</p>
            </div>
        `).join('');
    }

    // 5. Gráfico (Tela Relatórios)
    const canvasPatrimonio = document.getElementById('graficoPatrimonio');
    if(canvasPatrimonio && typeof Chart !== 'undefined') {
        const ctx = canvasPatrimonio.getContext('2d');
        if (window.meuGrafico) window.meuGrafico.destroy();
        window.meuGrafico = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                datasets: [{ label: 'Patrimônio', data: [120000, 135000, 140000, 155000, 160000, patrimonioLiquido], borderColor: '#3b82f6' }]
            }
        });
    }
}

// === CONTROLE DO MODAL MOVIMENTAÇÃO ===
function abrirModalMovimentacao() {
    const modal = document.getElementById('modal-movimentacao');
    if (modal) modal.classList.remove('hidden');
}

function fecharModalMovimentacao() {
    const modal = document.getElementById('modal-movimentacao');
    if (modal) modal.classList.add('hidden');
    
    const form = document.getElementById('form-movimentacao');
    if (form) form.reset();
    
    const movDataInput = document.getElementById('mov-data');
    if (movDataInput) movDataInput.valueAsDate = new Date();
}

async function salvarMovimentacao(event) {
    event.preventDefault();
    const btnSalvar = document.getElementById('btn-salvar');
    if (btnSalvar) {
        btnSalvar.innerHTML = '<i class="ph ph-spinner-gap animate-spin text-xl"></i> Salvando...';
        btnSalvar.disabled = true;
    }

    const novaMovimentacao = {
        id_movimentacao: 'MOV' + Date.now(),
        id_usuario: 'USR001',
        id_conta: 'CTA001',
        id_cartao: '',
        tipo: document.getElementById('mov-tipo') ? document.getElementById('mov-tipo').value : '',
        categoria: document.getElementById('mov-categoria') ? document.getElementById('mov-categoria').value : '',
        valor: parseFloat(document.getElementById('mov-valor') ? document.getElementById('mov-valor').value : 0),
        data: document.getElementById('mov-data') ? document.getElementById('mov-data').value : '',
        descricao: document.getElementById('mov-descricao') ? document.getElementById('mov-descricao').value : '',
        id_documento: ''
    };

    const payload = { action: 'insertRow', sheet: 'Movimentacoes', email: 'marcilio@example.com', data: novaMovimentacao };

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.status === 'success') {
            if(!db.movimentacoes) db.movimentacoes = [];
            db.movimentacoes.push(novaMovimentacao);
            renderDashboard();
            fecharModalMovimentacao();
        } else { 
            alert('Erro: ' + result.message); 
        }
    } catch (error) { 
        alert('Falha ao enviar.'); 
    } finally { 
        if (btnSalvar) {
            btnSalvar.innerHTML = 'Salvar Registro'; 
            btnSalvar.disabled = false; 
        }
    }
}

// === CONTROLE DO MODAL APORTES ===
function abrirModalAporte() {
    const select = document.getElementById('aporte-cofrinho');
    if (select) {
        select.innerHTML = '<option value="" disabled selected>Selecione...</option>';
        if(db.cofrinhos) {
            db.cofrinhos.forEach(cof => { select.innerHTML += `<option value="${cof.id_cofrinho}">${cof.nome}</option>`; });
        }
    }
    const modal = document.getElementById('modal-aporte');
    if (modal) modal.classList.remove('hidden');
}

function fecharModalAporte() { 
    const modal = document.getElementById('modal-aporte');
    if (modal) modal.classList.add('hidden'); 
}

async function salvarAporte(event) {
    event.preventDefault();
    const idCofrinho = document.getElementById('aporte-cofrinho').value;
    const valorAporte = parseFloat(document.getElementById('aporte-valor').value);
    
    if(!db.cofrinhos) return;
    const cofrinho = db.cofrinhos.find(c => c.id_cofrinho === idCofrinho);
    if(!cofrinho) return;
    
    const payload = {
        action: 'updateRow', sheet: 'Cofrinhos', email: 'marcilio@example.com',
        idKey: 'id_cofrinho', idValue: idCofrinho,
        data: { valor_atual: parseFloat(cofrinho.valor_atual) + valorAporte }
    };

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.status === 'success') {
            cofrinho.valor_atual = parseFloat(cofrinho.valor_atual) + valorAporte;
            renderDashboard();
            fecharModalAporte();
        }
    } catch (error) { 
        alert('Erro ao atualizar.'); 
    }
}

// === LÓGICA DE BAIXA AUTOMÁTICA (CONTAS A PAGAR) ===
async function pagarConta(idContaPagar) {
    const evt = window.event;
    let btn = null;
    if (evt) {
        btn = evt.currentTarget || evt.target;
        btn.disabled = true;
        btn.innerText = 'Processando...';
    }

    const payload = {
        action: 'liquidarConta',
        email: 'marcilio@example.com',
        idContaPagar: idContaPagar
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            await fetchAllData(); 
        } else {
            alert('Erro: ' + result.message);
            if (btn) {
                btn.disabled = false;
                btn.innerText = 'Pagar';
            }
        }
    } catch (error) {
        alert('Falha na comunicação com o servidor.');
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'Pagar';
        }
    }
}
