const API_URL = 'https://script.google.com/macros/s/AKfycbzJZCXIiEWxDmGoSzyz6IZ7LadFOb29kvZJkrivZUbFlcJYWn6o6_OL1P3h5l9jgm3qKA/exec';
let db = {};

// === INICIALIZAÇÃO ===
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

    // Fechar modais ao clicar fora
    window.onclick = function(event) {
        const modalMov = document.getElementById('modal-movimentacao');
        const modalAporte = document.getElementById('modal-aporte');
        if (event.target == modalMov) fecharModalMovimentacao();
        if (event.target == modalAporte) fecharModalAporte();
    }
};

// === UTILITÁRIOS ===
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const shortDate = String(dateString).substring(0, 10);
    const date = new Date(shortDate + 'T12:00:00');
    return new Intl.DateTimeFormat('pt-BR').format(date);
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

    // 4. Renderiza os dados específicos da tela atual
    renderizarDadosDaTela(screenId);
}

function renderizarDadosDaTela(screenId) {
    // Garantir que os arrays existam para evitar erros de leitura
    db.contas = db.contas || [];
    db.investimentos = db.investimentos || [];
    db.cartoes = db.cartoes || [];
    db.contasPagar = db.contasPagar || []; 
    db.movimentacoes = db.movimentacoes || [];
    db.cofrinhos = db.cofrinhos || [];

    switch(screenId) {
        case 'dashboard': renderDashboard(); break;
        case 'movimentacoes': renderMovimentacoesCompleta(); break;
        case 'cartoes': renderCartoesDetalhado(); break;
        case 'contas': renderContasBancarias(); break;
        case 'pagamentos': renderContasPagarReceberCompleta(); break;
        case 'investimentos': renderInvestimentos(); break;
        case 'cofrinhos': renderCofrinhos(); break;
        case 'relatorios': renderGraficoPatrimonio(); break;
    }
}

// === AUTENTICAÇÃO E BUSCA DE DADOS ===
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

async function fetchAllData() {
    try {
        const response = await fetch(`${API_URL}?action=getAllData&email=marcilio@example.com`);
        const result = await response.json();
        
        if (result.status === 'success') {
            db = result.data;
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('app-screen').classList.remove('hidden');
            // Força a tela inicial a ser o dashboard após o login
            changeScreen('dashboard');
        } else {
            alert('Erro: ' + result.message);
            logout();
        }
    } catch (error) {
        alert('Falha na conexão.');
        logout();
    }
}

// === RENDERIZAÇÃO DAS TELAS ===

function renderDashboard() {
    // 1. Cálculos base
    const saldoTotal = db.contas.reduce((acc, c) => acc + (parseFloat(c.saldo_atual) || 0), 0);
    const totalInvestimentos = db.investimentos.reduce((acc, i) => acc + (parseFloat(i.valor_atual) || 0), 0);
    const totalCartoes = db.cartoes.reduce((acc, c) => acc + (parseFloat(c.limite_utilizado) || 0), 0);
    const patrimonioLiquido = saldoTotal + totalInvestimentos - totalCartoes;

    // 2. Preenchimento dos Cards
    const cardSaldo = document.getElementById('card-saldo');
    if(cardSaldo) cardSaldo.innerText = formatCurrency(saldoTotal);

    const cardInvestimentos = document.getElementById('card-investimentos');
    if(cardInvestimentos) cardInvestimentos.innerText = formatCurrency(totalInvestimentos);

    const cardCartao = document.getElementById('card-cartoes');
    if(cardCartao) cardCartao.innerText = formatCurrency(totalCartoes);
    
    const cardPatrimonio = document.getElementById('card-patrimonio');
    if(cardPatrimonio) cardPatrimonio.innerText = formatCurrency(patrimonioLiquido);

    // 3. Tabela Resumo Movimentações
    const tabelaMov = document.getElementById('tabela-movimentacoes');
    if (tabelaMov) {
        tabelaMov.innerHTML = '';
        const ultimasMovs = [...db.movimentacoes].reverse().slice(0, 5);
        
        if (ultimasMovs.length === 0) {
            tabelaMov.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-500">Nenhuma movimentação encontrada.</td></tr>';
        } else {
            ultimasMovs.forEach(mov => {
                const isEntrada = mov.tipo === 'Entrada';
                const corValor = isEntrada ? 'text-emerald-400' : 'text-red-400';
                const sinal = isEntrada ? '+' : '-';

                tabelaMov.innerHTML += `
                    <tr class="hover:bg-slate-800/30 transition-colors border-b border-slate-700/50">
                        <td class="p-4 text-slate-300">${formatDate(mov.data)}</td>
                        <td class="p-4 text-white font-medium">${mov.descricao}</td>
                        <td class="p-4"><span class="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs">${mov.categoria}</span></td>
                        <td class="p-4 text-right font-bold ${corValor}">${sinal} ${formatCurrency(mov.valor)}</td>
                    </tr>
                `;
            });
        }
    }

    // 4. Lista Resumo Cartões (Dashboard)
    const listaCartoes = document.getElementById('lista-cartoes');
    if(listaCartoes) {
        listaCartoes.innerHTML = db.cartoes.map(c => `
            <div class="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                <div class="flex items-center gap-3">
                    <i class="ph ph-credit-card text-2xl text-slate-400"></i>
                    <div>
                        <p class="text-white font-medium">${c.nome_cartao}</p>
                    </div>
                </div>
                <span class="font-bold text-red-400">${formatCurrency(c.limite_utilizado)}</span>
            </div>
        `).join('') || '<p class="text-slate-500 text-sm">Nenhum cartão cadastrado.</p>';
    }

    // 5. Lista Calendário Resumo (Dashboard)
    const listaCalendario = document.getElementById('lista-calendario');
    if(listaCalendario) {
        const proximasContas = [...db.contasPagar].sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento)).slice(0, 4);
        listaCalendario.innerHTML = proximasContas.map(c => `
            <li class="flex justify-between items-center p-3 border border-slate-700 rounded-lg">
                <div class="flex items-center gap-3">
                    <i class="ph ph-arrow-up-right text-red-400 text-xl"></i>
                    <div>
                        <p class="text-white text-sm font-medium">${c.descricao}</p>
                        <p class="text-xs text-slate-400">Vence: ${formatDate(c.data_vencimento)}</p>
                    </div>
                </div>
                <span class="text-sm font-bold text-white">${formatCurrency(c.valor)}</span>
            </li>
        `).join('') || '<p class="text-slate-500 text-sm">Nenhuma conta próxima.</p>';
    }
}

function renderMovimentacoesCompleta() {
    const tbody = document.getElementById('tabela-movimentacoes-completa');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const movs = [...db.movimentacoes].reverse();
    if(movs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-500">Nenhum histórico encontrado.</td></tr>';
        return;
    }

    movs.forEach(mov => {
        const isEntrada = mov.tipo === 'Entrada';
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/30 transition-colors";
        tr.innerHTML = `
            <td class="p-4 text-slate-300">${formatDate(mov.data)}</td>
            <td class="p-4 text-white font-medium">${mov.descricao}</td>
            <td class="p-4"><span class="bg-slate-800 px-2 py-1 rounded text-xs text-slate-300">${mov.categoria}</span></td>
            <td class="p-4 text-slate-400 text-sm">${mov.id_conta || mov.conta || '-'}</td>
            <td class="p-4 text-right font-bold ${isEntrada ? 'text-emerald-400' : 'text-red-400'}">
                ${isEntrada ? '+' : '-'} ${formatCurrency(mov.valor)}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderCartoesDetalhado() {
    const container = document.getElementById('lista-cartoes-detalhada');
    if(!container) return;
    
    if(db.cartoes.length === 0) {
        container.innerHTML = '<p class="text-slate-500 col-span-full">Nenhum cartão registrado.</p>';
        return;
    }

    container.innerHTML = db.cartoes.map(c => {
        const limiteReal = parseFloat(c.limite) || 0;
        const utilizado = parseFloat(c.limite_utilizado) || 0;
        const perc = limiteReal > 0 ? (utilizado / limiteReal) * 100 : 0;
        
        return `
            <div class="bg-card p-6 rounded-xl border border-slate-700 relative overflow-hidden">
                <div class="flex justify-between items-start mb-6">
                    <h3 class="text-lg font-bold text-white">${c.nome_cartao}</h3>
                    <i class="ph ph-credit-card text-2xl text-slate-400"></i>
                </div>
                <p class="text-sm text-slate-400 mb-1">Fatura Atual</p>
                <h4 class="text-3xl font-bold text-red-400 mb-6">${formatCurrency(utilizado)}</h4>
                
                <div class="space-y-2">
                    <div class="flex justify-between text-xs text-slate-400">
                        <span>Limite Total</span>
                        <span>${formatCurrency(limiteReal)}</span>
                    </div>
                    <div class="w-full bg-slate-800 rounded-full h-2">
                        <div class="bg-blue-500 h-2 rounded-full" style="width: ${perc}%"></div>
                    </div>
                    <p class="text-xs text-right text-slate-500 mt-1">Disponível: ${formatCurrency(limiteReal - utilizado)}</p>
                </div>
            </div>
        `;
    }).join('');
}

function renderContasBancarias() {
    const container = document.getElementById('lista-contas-detalhada');
    if(!container) return;
    
    if(db.contas.length === 0) {
        container.innerHTML = '<p class="text-slate-500 col-span-full">Nenhuma conta bancária registrada.</p>';
        return;
    }

    container.innerHTML = db.contas.map(conta => `
        <div class="bg-card p-6 rounded-xl border border-slate-700 flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                <i class="ph ph-bank text-2xl text-primary"></i>
            </div>
            <div class="flex-1">
                <p class="text-xs text-slate-400">Conta Institucional</p>
                <h3 class="text-lg font-bold text-white">${conta.nome || 'Conta Bancária'}</h3>
            </div>
            <div class="text-right">
                <p class="text-sm text-slate-400">Saldo</p>
                <p class="text-xl font-bold text-blue-400">${formatCurrency(conta.saldo_atual)}</p>
            </div>
        </div>
    `).join('');
}

function renderContasPagarReceberCompleta() {
    const container = document.getElementById('tabela-contas-pagar');
    if(!container) return;
    
    if(db.contasPagar.length === 0) {
        container.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-500">Nenhuma conta pendente.</td></tr>';
        return;
    }

    container.innerHTML = db.contasPagar.map(c => `
        <tr class="hover:bg-slate-800/30 transition-colors border-b border-slate-700/50">
            <td class="p-4">
                <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-red-500/10 text-red-400">
                        <i class="ph ph-arrow-up-right text-xl"></i>
                    </div>
                    <div>
                        <p class="text-white font-medium">${c.descricao}</p>
                        <p class="text-xs text-slate-400">Vence em: ${formatDate(c.data_vencimento)}</p>
                    </div>
                </div>
            </td>
            <td class="p-4 text-center hidden sm:table-cell">
                <span class="bg-slate-800 px-3 py-1 rounded-full text-xs text-slate-300 border border-slate-600">Pendente</span>
            </td>
            <td class="p-4 text-right font-bold text-white">${formatCurrency(c.valor)}</td>
            <td class="p-4 text-right">
                <button onclick="pagarConta('${c.id_conta_pagar}')" class="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm font-bold text-white transition">Liquidar</button>
            </td>
        </tr>
    `).join('');
}

function renderInvestimentos() {
    const container = document.getElementById('lista-investimentos-detalhada');
    if(!container) return;

    if(db.investimentos.length === 0) {
        container.innerHTML = '<p class="text-slate-500 col-span-full">Nenhum investimento registrado.</p>';
        return;
    }

    container.innerHTML = db.investimentos.map(inv => `
        <div class="bg-card p-6 rounded-xl border border-slate-700">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <span class="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Renda Variável / Fixa</span>
                    <h3 class="text-lg font-bold text-white mt-2">${inv.nome || 'Investimento'}</h3>
                </div>
                <i class="ph ph-trend-up text-2xl text-emerald-500"></i>
            </div>
            <div class="mt-4 pt-4 border-t border-slate-800">
                <p class="text-xs text-slate-400">Saldo Atual</p>
                <h4 class="text-2xl font-bold text-white mt-1">${formatCurrency(inv.valor_atual)}</h4>
            </div>
        </div>
    `).join('');
}

function renderCofrinhos() {
    const container = document.getElementById('lista-cofrinhos-detalhada');
    if(!container) return;

    if(db.cofrinhos.length === 0) {
        container.innerHTML = '<p class="text-slate-500 col-span-full">Nenhum cofrinho cadastrado.</p>';
        return;
    }

    container.innerHTML = db.cofrinhos.map(cof => {
        const guardado = parseFloat(cof.valor_atual) || 0;
        const meta = parseFloat(cof.meta) || guardado; // Fallback se não existir meta no banco
        const progresso = meta > 0 ? Math.min((guardado / meta) * 100, 100).toFixed(0) : 100;

        return `
            <div class="bg-card p-6 rounded-xl border border-slate-700 text-center">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500 bg-opacity-20 mb-4">
                    <i class="ph ph-piggy-bank text-3xl text-emerald-400"></i>
                </div>
                <h3 class="text-lg font-bold text-white">${cof.nome}</h3>
                <p class="text-2xl font-bold text-white my-2">${formatCurrency(guardado)}</p>
                ${cof.meta ? `<p class="text-sm text-slate-400 mb-4">de ${formatCurrency(meta)}</p>` : ''}
                
                <div class="w-full bg-slate-800 rounded-full h-3 mb-2 mt-4">
                    <div class="bg-emerald-500 h-3 rounded-full transition-all duration-1000" style="width: ${progresso}%"></div>
                </div>
                <p class="text-xs text-slate-400 text-right">${progresso}% concluído</p>
            </div>
        `;
    }).join('');
}

function renderGraficoPatrimonio() {
    const canvasPatrimonio = document.getElementById('graficoPatrimonio');
    if(canvasPatrimonio && typeof Chart !== 'undefined') {
        const saldoTotal = db.contas.reduce((acc, c) => acc + (parseFloat(c.saldo_atual) || 0), 0);
        const invTotal = db.investimentos.reduce((acc, i) => acc + (parseFloat(i.valor_atual) || 0), 0);
        const cartoesTotal = db.cartoes.reduce((acc, c) => acc + (parseFloat(c.limite_utilizado) || 0), 0);
        const patrimonioLiquido = saldoTotal + invTotal - cartoesTotal;

        const ctx = canvasPatrimonio.getContext('2d');
        if (window.meuGrafico) window.meuGrafico.destroy();
        
        window.meuGrafico = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Atual'],
                datasets: [{ 
                    label: 'Patrimônio', 
                    data: [0, 0, 0, 0, 0, patrimonioLiquido], // Mock dos meses passados até implementarmos histórico na API
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    }
}

// === CONTROLES DE MODAL E API (POST) ===

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
            db.movimentacoes.push(novaMovimentacao);
            renderizarDadosDaTela('dashboard'); // Atualiza a tela base
            renderizarDadosDaTela('movimentacoes'); // Atualiza a tabela detalhada
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

function abrirModalAporte() {
    const select = document.getElementById('aporte-cofrinho');
    if (select) {
        select.innerHTML = '<option value="" disabled selected>Selecione o Cofrinho...</option>';
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
    const form = document.getElementById('form-aporte');
    if (form) form.reset();
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
        data: { valor_atual: parseFloat(cofrinho.valor_atual || 0) + valorAporte }
    };

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.status === 'success') {
            cofrinho.valor_atual = parseFloat(cofrinho.valor_atual || 0) + valorAporte;
            renderizarDadosDaTela('cofrinhos');
            fecharModalAporte();
        }
    } catch (error) { 
        alert('Erro ao atualizar.'); 
    }
}

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
            await fetchAllData(); // Recarrega do zero para atualizar o dashboard
        } else {
            alert('Erro: ' + result.message);
            if (btn) {
                btn.disabled = false;
                btn.innerText = 'Liquidar';
            }
        }
    } catch (error) {
        alert('Falha na comunicação com o servidor.');
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'Liquidar';
        }
    }
}
