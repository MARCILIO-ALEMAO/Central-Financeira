const API_URL = 'https://script.google.com/macros/s/AKfycbzJZCXIiEWxDmGoSzyz6IZ7LadFOb29kvZJkrivZUbFlcJYWn6o6_OL1P3h5l9jgm3qKA/exec';
let db = {};

window.onload = function () {
    const buttonDiv = document.getElementById("buttonDiv");
    buttonDiv.innerHTML = `
        <button onclick="handleCredentialResponse()" class="bg-white text-slate-800 font-medium py-2 px-4 rounded flex items-center gap-2 hover:bg-slate-100 transition w-full justify-center">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-5 h-5" alt="Google">
            Entrar com Google
        </button>
    `;

    document.getElementById('mov-data').valueAsDate = new Date();
    document.getElementById('form-movimentacao').addEventListener('submit', salvarMovimentacao);
    document.getElementById('form-aporte').addEventListener('submit', salvarAporte);
};

// === SISTEMA DE NAVEGAÇÃO SPA ===
function changeScreen(screenId) {
    // 1. Esconde todas as telas
    const screens = document.querySelectorAll('.screen-content');
    screens.forEach(screen => screen.classList.remove('active'));

    // 2. Mostra a tela alvo
    document.getElementById(`screen-${screenId}`).classList.add('active');

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
    // Se o backend mockar arrays vazios em caso de não existência:
    db.contas = db.contas || [];
    db.investimentos = db.investimentos || [];
    db.cartoes = db.cartoes || [];
    db.movimentacoes = db.movimentacoes || [];
    db.configuracoes = db.configuracoes || [];
    db.cofrinhos = db.cofrinhos || [];
    db.contasPagar = db.contasPagar || []; 

    const saldoTotal = db.contas.reduce((acc, conta) => acc + (parseFloat(conta.saldo_atual) || 0), 0);
    const invTotal = db.investimentos.reduce((acc, inv) => acc + (parseFloat(inv.valor_atual) || 0), 0);
    const cartoesTotal = db.cartoes.reduce((acc, cartao) => acc + (parseFloat(cartao.limite_utilizado) || 0), 0);
    const patrimonioLiquido = saldoTotal + invTotal - cartoesTotal;

    document.getElementById('card-saldo').innerText = formatCurrency(saldoTotal);
    document.getElementById('card-investimentos').innerText = formatCurrency(invTotal);
    document.getElementById('card-cartoes').innerText = formatCurrency(cartoesTotal);
    document.getElementById('card-patrimonio').innerText = formatCurrency(patrimonioLiquido);

    const tabelaMov = document.getElementById('tabela-movimentacoes');
    if(tabelaMov) {
        tabelaMov.innerHTML = '';

        const ultimasMovs = db.movimentacoes.slice(-5).reverse();
        if (ultimasMovs.length === 0) {
            tabelaMov.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-500">Nenhuma movimentação encontrada.</td></tr>';
        } else {
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
    }

    // === RENDERIZAÇÃO DA META PRINCIPAL ===
    const configMeta = db.configuracoes.find(c => c.chave === 'meta_principal_valor');
    const valorMetaPrincipal = configMeta ? parseFloat(configMeta.valor) : 600000;
    
    let percentualMeta = (patrimonioLiquido / valorMetaPrincipal) * 100;
    if (percentualMeta > 100) percentualMeta = 100;
    if (percentualMeta < 0) percentualMeta = 0;
    
    const valorFaltante = valorMetaPrincipal - patrimonioLiquido;

    const metaValorAtualEl = document.getElementById('meta-valor-atual');
    if(metaValorAtualEl) {
        metaValorAtualEl.innerText = formatCurrency(patrimonioLiquido);
        document.getElementById('meta-valor-total').innerText = `/ ${formatCurrency(valorMetaPrincipal)}`;
        document.getElementById('meta-barra').style.width = `${percentualMeta}%`;
        document.getElementById('meta-percentual').innerText = `${percentualMeta.toFixed(2)}% concluído`;
        document.getElementById('meta-faltante').innerText = `Faltam ${formatCurrency(valorFaltante > 0 ? valorFaltante : 0)}`;
    }

    // === RENDERIZAÇÃO DOS COFRINHOS ===
    const listaCofrinhos = document.getElementById('lista-cofrinhos');
    if(listaCofrinhos) {
        listaCofrinhos.innerHTML = '';

        if (db.cofrinhos.length === 0) {
            listaCofrinhos.innerHTML = '<p class="text-slate-500 text-center py-4">Nenhum cofrinho criado ainda.</p>';
        } else {
            db.cofrinhos.forEach(cof => {
                const meta = parseFloat(cof.meta) || 0;
                const atual = parseFloat(cof.valor_atual) || 0;
                let percentual = meta > 0 ? (atual / meta) * 100 : 0;
                if (percentual > 100) percentual = 100;

                let corBarra = 'bg-blue-500';
                if (percentual >= 100) corBarra = 'bg-emerald-500';
                else if (percentual > 50) corBarra = 'bg-teal-400';

                const itemHTML = `
                    <div>
                        <div class="flex justify-between items-end mb-1">
                            <div>
                                <p class="text-white font-medium">${cof.nome}</p>
                                <p class="text-xs text-slate-400">${cof.descricao}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-sm font-bold text-white">${formatCurrency(atual)}</p>
                                <p class="text-xs text-slate-500">de ${formatCurrency(meta)}</p>
                            </div>
                        </div>
                        <div class="w-full bg-slate-800 rounded-full h-2">
                            <div class="${corBarra} h-2 rounded-full transition-all duration-1000" style="width: ${percentual}%"></div>
                        </div>
                    </div>
                `;
                listaCofrinhos.insertAdjacentHTML('beforeend', itemHTML);
            });
        }
    }

    // === RENDERIZAÇÃO DE CONTAS A PAGAR ===
    const tabelaContas = document.getElementById('tabela-contas-pagar');
    if(tabelaContas) {
        tabelaContas.innerHTML = '';

        const contasPendentes = db.contasPagar.filter(c => c.status === 'Pendente');
        
        if (contasPendentes.length === 0) {
            tabelaContas.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-500">Nenhuma conta pendente.</td></tr>';
        } else {
            contasPendentes.forEach(conta => {
                tabelaContas.innerHTML += `
                    <tr class="hover:bg-slate-800/30 transition-colors">
                        <td class="p-4 text-white font-medium">${conta.descricao}</td>
                        <td class="p-4 text-slate-300">${formatDate(conta.data_vencimento)}</td>
                        <td class="p-4 text-red-400 font-bold">${formatCurrency(conta.valor)}</td>
                        <td class="p-4 text-right">
                            <button onclick="pagarConta('${conta.id_conta_pagar}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs font-bold transition">
                                Pagar
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
    }
}

// === CONTROLE DO MODAL MOVIMENTAÇÃO ===
function abrirModalMovimentacao() {
    document.getElementById('modal-movimentacao').classList.remove('hidden');
}

function fecharModalMovimentacao() {
    document.getElementById('modal-movimentacao').classList.add('hidden');
    document.getElementById('form-movimentacao').reset();
    document.getElementById('mov-data').valueAsDate = new Date();
}

async function salvarMovimentacao(event) {
    event.preventDefault();
    const btnSalvar = document.getElementById('btn-salvar');
    btnSalvar.innerHTML = '<i class="ph ph-spinner-gap animate-spin text-xl"></i> Salvando...';
    btnSalvar.disabled = true;

    const novaMovimentacao = {
        id_movimentacao: 'MOV' + Date.now(),
        id_usuario: 'USR001',
        id_conta: 'CTA001',
        id_cartao: '',
        tipo: document.getElementById('mov-tipo').value,
        categoria: document.getElementById('mov-categoria').value,
        valor: parseFloat(document.getElementById('mov-valor').value),
        data: document.getElementById('mov-data').value,
        descricao: document.getElementById('mov-descricao').value,
        id_documento: ''
    };

    const payload = { action: 'insertRow', sheet: 'Movimentacoes', email: 'marcilio@example.com', data: novaMovimentacao };

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.status === 'success') {
            db.movimentacoes.push(novaMovimentacao);
            renderDashboard();
            fecharModalMovimentacao();
        } else { alert('Erro: ' + result.message); }
    } catch (error) { alert('Falha ao enviar.'); }
    finally { btnSalvar.innerHTML = 'Salvar Registro'; btnSalvar.disabled = false; }
}

// === CONTROLE DO MODAL APORTES ===
function abrirModalAporte() {
    const select = document.getElementById('aporte-cofrinho');
    select.innerHTML = '<option value="" disabled selected>Selecione...</option>';
    db.cofrinhos.forEach(cof => { select.innerHTML += `<option value="${cof.id_cofrinho}">${cof.nome}</option>`; });
    document.getElementById('modal-aporte').classList.remove('hidden');
}

function fecharModalAporte() { 
    document.getElementById('modal-aporte').classList.add('hidden'); 
}

async function salvarAporte(event) {
    event.preventDefault();
    const idCofrinho = document.getElementById('aporte-cofrinho').value;
    const valorAporte = parseFloat(document.getElementById('aporte-valor').value);
    const cofrinho = db.cofrinhos.find(c => c.id_cofrinho === idCofrinho);
    
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
    } catch (error) { alert('Erro ao atualizar.'); }
}

// === LÓGICA DE BAIXA AUTOMÁTICA (CONTAS A PAGAR) - VIA FRONTEND ===
async function liquidarConta(idContaPagar) {
    // 1. Encontra a conta no banco de dados local
    const conta = db.contasPagar.find(c => c.id_conta_pagar === idContaPagar);
    
    if (!conta) {
        alert('Conta não encontrada!');
        return;
    }
    
    // 2. Prepara a nova Movimentação de Saída
    const novaMov = {
        id_movimentacao: 'MOV' + Date.now(),
        id_usuario: 'USR001',
        id_conta: 'CTA001', // Assume a conta principal
        id_cartao: '',
        tipo: 'Saída',
        categoria: conta.categoria || 'Outros', // Utiliza a categoria da conta
        valor: parseFloat(conta.valor),
        data: new Date().toISOString().split('T')[0],
        descricao: 'PAGAMENTO: ' + conta.descricao,
        id_documento: ''
    };

    const payloadInsert = {
        action: 'insertRow', 
        sheet: 'Movimentacoes', 
        email: 'marcilio@example.com', 
        data: novaMov
    };

    // 3. Prepara a atualização de Status para "Pago" na aba ContasPagar
    const payloadUpdate = {
        action: 'updateRow', 
        sheet: 'ContasPagar', 
        email: 'marcilio@example.com',
        idKey: 'id_conta_pagar', 
        idValue: idContaPagar,
        data: { status: 'Pago' }
    };

    try {
        // Dispara as requisições
        const [resInsert, resUpdate] = await Promise.all([
            fetch(API_URL, { method: 'POST', body: JSON.stringify(payloadInsert) }),
            fetch(API_URL, { method: 'POST', body: JSON.stringify(payloadUpdate) })
        ]);

        const resultInsert = await resInsert.json();
        const resultUpdate = await resUpdate.json();

        if (resultInsert.status === 'success' && resultUpdate.status === 'success') {
            // Atualiza os dados locais
            db.movimentacoes.push(novaMov);
            conta.status = 'Pago';
            
            // Re-renderiza o painel
            renderDashboard();
            alert(`Conta "${conta.descricao}" liquidada com sucesso!`);
        } else {
            alert('Aviso: Houve uma falha ao liquidar a conta no servidor.');
            console.error('Inserção:', resultInsert, 'Atualização:', resultUpdate);
        }
    } catch (error) {
        alert('Falha na comunicação com o servidor ao liquidar a conta.');
        console.error(error);
    }
}

// === NOVA LÓGICA DE BAIXA AUTOMÁTICA (AÇÃO ATÔMICA NO BACKEND) ===
async function pagarConta(idContaPagar) {
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
            alert('Conta paga com sucesso!');
            fetchAllData(); // Recarrega o dashboard para atualizar saldos e listas
        } else {
            alert('Erro: ' + result.message);
        }
    } catch (error) {
        alert('Falha na comunicação com o servidor.');
    }
}
