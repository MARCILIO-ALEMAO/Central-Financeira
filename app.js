const API_URL = 'https://script.google.com/macros/s/AKfycbzJZCXIiEWxDmGoSzyz6IZ7LadFOb29kvZJkrivZUbFlcJYWn6o6_OL1P3h5l9jgm3qKA/exec';
let db = {};

// === INICIALIZAÇÃO E EVENTOS ===
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

    // Configura data inicial e listeners de formulários
    const movDataInput = document.getElementById('mov-data');
    if (movDataInput) movDataInput.valueAsDate = new Date();

    document.getElementById('form-movimentacao')?.addEventListener('submit', salvarMovimentacao);
    document.getElementById('form-cofrinho')?.addEventListener('submit', salvarCofrinho);
    document.getElementById('form-transacao-cofre')?.addEventListener('submit', processarTransacaoCofre);
    document.getElementById('form-conta-pagar')?.addEventListener('submit', salvarContaPagar);
};

// === NAVEGAÇÃO SPA ===
function changeScreen(screenId) {
    document.querySelectorAll('.screen-content').forEach(s => s.classList.remove('active'));
    const targetScreen = document.getElementById(`screen-${screenId}`);
    if (targetScreen) targetScreen.classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.target === screenId) {
            btn.className = "nav-btn w-full flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-lg transition";
        } else {
            btn.className = "nav-btn w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition";
        }
    });
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

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(String(dateString).substring(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR');
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
        alert('Falha na conexão. Verifique o link da API.');
        logout();
    }
}

// === MOTOR DE RENDERIZAÇÃO CENTRAL ===
function renderDashboard() {
    db.contas = db.contas || [];
    db.investimentos = db.investimentos || [];
    db.cartoes = db.cartoes || [];
    db.contasPagar = db.contasPagar || []; 
    db.movimentacoes = db.movimentacoes || [];
    db.cofrinhos = db.cofrinhos || [];

    // 1. Cálculos de Patrimônio
    const saldoTotal = db.contas.reduce((acc, c) => acc + (parseFloat(c.saldo_atual) || 0), 0);
    const invTotal = db.investimentos.reduce((acc, i) => acc + (parseFloat(i.valor_atual) || 0), 0);
    const cartTotal = db.cartoes.reduce((acc, c) => acc + (parseFloat(c.limite_utilizado) || 0), 0);
    const patrimonioLiquido = saldoTotal + invTotal - cartTotal;

    if(document.getElementById('card-saldo')) document.getElementById('card-saldo').innerText = formatCurrency(saldoTotal);
    if(document.getElementById('card-investimentos')) document.getElementById('card-investimentos').innerText = formatCurrency(invTotal);
    if(document.getElementById('card-cartoes')) document.getElementById('card-cartoes').innerText = formatCurrency(cartTotal);
    if(document.getElementById('card-patrimonio')) document.getElementById('card-patrimonio').innerText = formatCurrency(patrimonioLiquido);

    // 2. Movimentações (Dashboard)
    const tabelaMov = document.getElementById('tabela-movimentacoes');
    if (tabelaMov) {
        const ultimasMovs = [...db.movimentacoes].slice(-5).reverse();
        if (ultimasMovs.length === 0) {
            tabelaMov.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-500">Nenhuma movimentação encontrada.</td></tr>';
        } else {
            tabelaMov.innerHTML = ultimasMovs.map(mov => `
                <tr class="hover:bg-slate-800/30 transition-colors">
                    <td class="p-4 text-slate-300">${formatDate(mov.data)}</td>
                    <td class="p-4 text-white font-medium">${mov.descricao}</td>
                    <td class="p-4"><span class="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">${mov.categoria}</span></td>
                    <td class="p-4 text-right font-bold ${mov.tipo === 'Entrada' ? 'text-emerald-400' : 'text-red-400'}">${mov.tipo === 'Entrada' ? '+' : '-'} ${formatCurrency(mov.valor)}</td>
                </tr>
            `).join('');
        }
    }

    // 3. Histórico de Movimentações (Completo)
    const tabelaMovCompleta = document.getElementById('tabela-movimentacoes-completa');
    if (tabelaMovCompleta) {
        const todasMovs = [...db.movimentacoes].reverse();
        tabelaMovCompleta.innerHTML = todasMovs.map(mov => `
            <tr class="hover:bg-slate-800/30 transition-colors">
                <td class="p-4 text-slate-300">${formatDate(mov.data)}</td>
                <td class="p-4 text-white font-medium">${mov.descricao}</td>
                <td class="p-4"><span class="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">${mov.categoria}</span></td>
                <td class="p-4 text-slate-400">${mov.id_conta || '-'}</td>
                <td class="p-4 text-right font-bold ${mov.tipo === 'Entrada' ? 'text-emerald-400' : 'text-red-400'}">${mov.tipo === 'Entrada' ? '+' : '-'} ${formatCurrency(mov.valor)}</td>
            </tr>
        `).join('');
    }

    // 4. Contas a Pagar
    const containerPag = document.getElementById('tabela-contas-pagar');
    if(containerPag) {
        containerPag.innerHTML = db.contasPagar.filter(c => c.status === 'Pendente').map(c => `
            <tr class="hover:bg-slate-800/30 border-b border-slate-700">
                <td class="p-4">
                    <p class="text-white font-medium">${c.descricao}</p>
                    <p class="text-xs text-slate-400">${formatDate(c.data_vencimento)}</p>
                </td>
                <td class="p-4 text-red-400 font-bold text-right">${formatCurrency(c.valor)}</td>
                <td class="p-4 text-right">
                    <button onclick="pagarConta('${c.id_conta_pagar}')" class="bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded text-xs font-bold text-white transition">Pagar</button>
                </td>
            </tr>
        `).join('');
    }

    // 5. Cartões (Resumo e Completo)
    const resumoCartoes = document.getElementById('lista-cartoes');
    if(resumoCartoes) {
        resumoCartoes.innerHTML = db.cartoes.map(c => `
            <div class="flex justify-between border-b border-slate-700 pb-2">
                <span>${c.nome_cartao}</span><span class="font-bold text-red-400">${formatCurrency(c.limite_utilizado)}</span>
            </div>
        `).join('');
    }

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

    // 6. Calendário Resumo
    const resumoCalendario = document.getElementById('lista-calendario');
    if(resumoCalendario) {
        const proxVencimentos = [...db.contasPagar].filter(c => c.status === 'Pendente').sort((a,b) => new Date(a.data_vencimento) - new Date(b.data_vencimento)).slice(0, 3);
        resumoCalendario.innerHTML = proxVencimentos.map(c => `
            <li class="flex justify-between bg-slate-800 p-3 rounded">
                <span>${c.descricao}</span><span class="text-xs">${formatDate(c.data_vencimento)}</span>
            </li>
        `).join('');
    }

    // 7. Gráfico Patrimonial
    const canvasPatrimonio = document.getElementById('graficoPatrimonio');
    if(canvasPatrimonio && typeof Chart !== 'undefined') {
        const ctx = canvasPatrimonio.getContext('2d');
        if (window.meuGrafico) window.meuGrafico.destroy();
        window.meuGrafico = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Atual'],
                datasets: [{ label: 'Patrimônio Líquido', data: [120000, 135000, 140000, 155000, 160000, patrimonioLiquido], borderColor: '#3b82f6', tension: 0.4 }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 8. COFRINHOS TURBINADOS
    const listaCof = document.getElementById('lista-cofrinhos-detalhada');
    if (listaCof) {
        if (db.cofrinhos.length === 0) {
            listaCof.innerHTML = '<p class="text-slate-500 col-span-full text-center py-8">Nenhum cofrinho criado. Clique em "Novo Cofrinho" para começar.</p>';
        } else {
            listaCof.innerHTML = db.cofrinhos.map(cof => {
                const meta = parseFloat(cof.meta) || 0;
                const atual = parseFloat(cof.valor_atual) || 0;
                let pct = meta > 0 ? (atual / meta) * 100 : 0;
                if (pct > 100) pct = 100;
                let corBarra = pct >= 100 ? 'bg-emerald-500' : (pct > 50 ? 'bg-blue-400' : 'bg-blue-600');

                return `
                    <div class="bg-card p-6 rounded-xl border border-slate-700 flex flex-col">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h4 class="text-white font-bold text-lg">${cof.nome}</h4>
                                <p class="text-xs text-slate-400">${cof.descricao || ''}</p>
                            </div>
                            <button onclick="abrirModalCofrinho('${cof.id_cofrinho}')" class="text-slate-400 hover:text-white transition" title="Editar">
                                <i class="ph ph-pencil-simple text-xl"></i>
                            </button>
                        </div>
                        
                        <div class="mt-4 mb-2 flex justify-between items-end">
                            <span class="text-2xl font-bold text-white">${formatCurrency(atual)}</span>
                            <span class="text-xs text-slate-500">Meta: ${formatCurrency(meta)}</span>
                        </div>
                        
                        <div class="w-full bg-slate-800 rounded-full h-2 mb-2">
                            <div class="${corBarra} h-2 rounded-full transition-all" style="width: ${pct}%"></div>
                        </div>
                        <p class="text-right text-xs text-slate-400 mb-6">${pct.toFixed(1)}% alcançado</p>
                        
                        <div class="mt-auto grid grid-cols-2 gap-3">
                            <button onclick="abrirModalTransacaoCofre('${cof.id_cofrinho}', 'retirada')" class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-red-400 rounded-lg text-sm font-medium transition">Retirar</button>
                            <button onclick="abrirModalTransacaoCofre('${cof.id_cofrinho}', 'aporte')" class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition">Aportar</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

// === CONTROLES DE MOVIMENTAÇÃO ===
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
        tipo: document.getElementById('mov-tipo').value,
        categoria: document.getElementById('mov-categoria').value,
        valor: parseFloat(document.getElementById('mov-valor').value),
        data: document.getElementById('mov-data').value,
        descricao: document.getElementById('mov-descricao').value,
        id_documento: ''
    };

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'insertRow', sheet: 'Movimentacoes', email: 'marcilio@example.com', data: novaMovimentacao }) });
        const result = await response.json();
        if (result.status === 'success') {
            db.movimentacoes.push(novaMovimentacao);
            renderDashboard();
            fecharModalMovimentacao();
        } else { alert('Erro: ' + result.message); }
    } catch (error) { alert('Falha ao enviar.'); } 
    finally { 
        if (btnSalvar) { btnSalvar.innerHTML = 'Salvar Registro'; btnSalvar.disabled = false; } 
    }
}

// === PAGAR CONTA ===
async function pagarConta(idContaPagar) {
    const evt = window.event;
    let btn = null;
    if (evt) {
        btn = evt.currentTarget || evt.target;
        btn.disabled = true;
        btn.innerText = 'Processando...';
    }

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'liquidarConta', email: 'marcilio@example.com', idContaPagar: idContaPagar }) });
        const result = await response.json();
        if (result.status === 'success') {
            await fetchAllData(); 
        } else {
            alert('Erro: ' + result.message);
            if (btn) { btn.disabled = false; btn.innerText = 'Pagar'; }
        }
    } catch (error) {
        alert('Falha na comunicação.');
        if (btn) { btn.disabled = false; btn.innerText = 'Pagar'; }
    }
}

// === MÓDULO TURBINADO: COFRINHOS ===
function abrirModalCofrinho(id = null) {
    const modal = document.getElementById('modal-cofrinho');
    const form = document.getElementById('form-cofrinho');
    if (!modal || !form) return;

    form.reset();
    const btnDeletar = document.getElementById('btn-deletar-cof');
    
    if (id) {
        const cof = db.cofrinhos.find(c => c.id_cofrinho === id);
        if (cof) {
            document.getElementById('titulo-modal-cofrinho').innerText = 'Editar Cofrinho';
            document.getElementById('cof-id').value = cof.id_cofrinho;
            document.getElementById('cof-nome').value = cof.nome;
            document.getElementById('cof-desc').value = cof.descricao || '';
            document.getElementById('cof-meta').value = cof.meta;
            document.getElementById('cof-atual').value = cof.valor_atual;
        }
        if (btnDeletar) btnDeletar.classList.remove('hidden');
    } else {
        document.getElementById('titulo-modal-cofrinho').innerText = 'Novo Cofrinho';
        document.getElementById('cof-id').value = '';
        if (btnDeletar) btnDeletar.classList.add('hidden');
    }
    
    modal.classList.remove('hidden');
}

function fecharModalCofrinho() {
    const modal = document.getElementById('modal-cofrinho');
    if (modal) modal.classList.add('hidden');
}

async function salvarCofrinho(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-cof');
    if(btn) { btn.innerHTML = 'Processando...'; btn.disabled = true; }

    const idCof = document.getElementById('cof-id').value;
    const isEdit = idCof !== '';
    
    const dados = {
        id_usuario: 'USR001',
        nome: document.getElementById('cof-nome').value,
        descricao: document.getElementById('cof-desc').value,
        meta: parseFloat(document.getElementById('cof-meta').value),
        valor_atual: parseFloat(document.getElementById('cof-atual').value)
    };

    const payload = {
        action: isEdit ? 'updateRow' : 'insertRow',
        sheet: 'Cofrinhos',
        email: 'marcilio@example.com',
        data: isEdit ? dados : { id_cofrinho: 'COF' + Date.now(), ...dados },
        ...(isEdit && { idKey: 'id_cofrinho', idValue: idCof })
    };

    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await res.json();
        if (result.status === 'success') {
            await fetchAllData(); 
            fecharModalCofrinho();
        } else { alert('Erro: ' + result.message); }
    } catch(err) { alert('Falha ao salvar cofrinho.'); }
    finally { if(btn) { btn.innerHTML = 'Salvar Cofrinho'; btn.disabled = false; } }
}

function abrirModalTransacaoCofre(id, tipo) {
    const cof = db.cofrinhos.find(c => c.id_cofrinho === id);
    if(!cof) return;

    document.getElementById('trans-cof-id').value = cof.id_cofrinho;
    document.getElementById('trans-tipo').value = tipo;
    document.getElementById('trans-cof-nome').innerText = `Cofrinho: ${cof.nome} | Saldo: ${formatCurrency(cof.valor_atual)}`;
    
    document.getElementById('form-transacao-cofre').reset();
    
    const titulo = document.getElementById('titulo-transacao-cofre');
    const btn = document.getElementById('btn-salvar-trans');
    
    if (tipo === 'aporte') {
        titulo.innerText = 'Guardar Dinheiro';
        btn.className = 'w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg mt-2 transition';
        btn.innerText = 'Confirmar Aporte';
    } else {
        titulo.innerText = 'Retirar Dinheiro';
        btn.className = 'w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg mt-2 transition';
        btn.innerText = 'Confirmar Retirada';
    }

    document.getElementById('modal-transacao-cofre').classList.remove('hidden');
}

function fecharModalTransacaoCofre() {
    document.getElementById('modal-transacao-cofre').classList.add('hidden');
}

async function processarTransacaoCofre(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-trans');
    if(btn) { btn.innerHTML = 'Processando...'; btn.disabled = true; }

    const idCof = document.getElementById('trans-cof-id').value;
    const tipo = document.getElementById('trans-tipo').value;
    const valorTransacao = parseFloat(document.getElementById('trans-valor').value);
    
    const cof = db.cofrinhos.find(c => c.id_cofrinho === idCof);
    let novoValor = parseFloat(cof.valor_atual);

    if (tipo === 'aporte') {
        novoValor += valorTransacao;
    } else {
        novoValor -= valorTransacao;
        if (novoValor < 0) {
            alert('Saldo insuficiente no cofrinho!');
            if(btn) { btn.innerText = 'Confirmar'; btn.disabled = false; }
            return;
        }
    }

    const payload = { action: 'updateRow', sheet: 'Cofrinhos', email: 'marcilio@example.com', idKey: 'id_cofrinho', idValue: idCof, data: { valor_atual: novoValor } };

    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await res.json();
        if (result.status === 'success') {
            await fetchAllData();
            fecharModalTransacaoCofre();
        } else { alert('Erro ao processar transação.'); }
    } catch(err) { alert('Falha de conexão.'); }
    finally { if(btn) { btn.innerText = 'Confirmar'; btn.disabled = false; } }
}

// === MÓDULO: DELETAR COFRINHO ===
async function deletarCofrinho() {
    const idCof = document.getElementById('cof-id').value;
    if (!confirm('Tem certeza que deseja excluir este cofrinho? Esta ação não pode ser desfeita.')) return;

    try {
        const res = await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'deleteRow', sheet: 'Cofrinhos', email: 'marcilio@example.com', idKey: 'id_cofrinho', idValue: idCof }) 
        });
        const result = await res.json();
        if (result.status === 'success') {
            await fetchAllData();
            fecharModalCofrinho();
        }
    } catch(e) { alert('Erro ao excluir.'); }
}

// === MÓDULO: NOVA CONTA A PAGAR ===
function abrirModalContaPagar() { 
    document.getElementById('modal-conta-pagar').classList.remove('hidden'); 
}

async function salvarContaPagar(e) {
    e.preventDefault();
    const novaConta = {
        id_conta_pagar: 'CP' + Date.now(),
        descricao: document.getElementById('cp-desc').value,
        valor: parseFloat(document.getElementById('cp-valor').value),
        data_vencimento: document.getElementById('cp-data').value,
        status: 'Pendente'
    };
    
    try {
        await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'insertRow', sheet: 'ContasPagar', email: 'marcilio@example.com', data: novaConta }) });
        await fetchAllData();
        document.getElementById('modal-conta-pagar').classList.add('hidden');
        document.getElementById('form-conta-pagar').reset();
    } catch(e) { alert('Erro ao salvar conta.'); }
}
