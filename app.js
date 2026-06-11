const API_URL = 'https://script.google.com/macros/s/AKfycbzJZCXIiEWxDmGoSzyz6IZ7LadFOb29kvZJkrivZUbFlcJYWn6o6_OL1P3h5l9jgm3qKA/exec';
let db = {};

// === INICIALIZAÇÃO ===
window.onload = function () {
    const buttonDiv = document.getElementById("buttonDiv");
    if(buttonDiv) {
        buttonDiv.innerHTML = `<button onclick="handleCredentialResponse()" class="bg-white text-slate-800 font-medium py-2 px-4 rounded flex items-center gap-2 hover:bg-slate-100 transition w-full justify-center"><img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-5 h-5" alt="Google">Entrar com Google</button>`;
    }

    const movDataInput = document.getElementById('mov-data');
    if (movDataInput) movDataInput.valueAsDate = new Date();

    document.getElementById('form-movimentacao')?.addEventListener('submit', salvarMovimentacao);
    document.getElementById('form-cofrinho')?.addEventListener('submit', salvarCofrinho);
    document.getElementById('form-transacao-cofre')?.addEventListener('submit', processarTransacaoCofre);
    document.getElementById('form-conta-pagar')?.addEventListener('submit', salvarContaPagar);
    
    // Configurações Listener adicionado aqui para seguir o padrão de inicialização
    document.getElementById('form-config-meta')?.addEventListener('submit', salvarMetaPatrimonio);
};

// === NAVEGAÇÃO SPA ===
function changeScreen(screenId) {
    document.querySelectorAll('.screen-content').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${screenId}`)?.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.className = (btn.dataset.target === screenId) 
            ? "nav-btn w-full flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-lg transition" 
            : "nav-btn w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition";
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

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const formatDate = (d) => d ? new Date(String(d).substring(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') : '-';

async function fetchAllData() {
    try {
        const res = await fetch(`${API_URL}?action=getAllData&email=marcilio@example.com`);
        const result = await res.json();
        if (result.status === 'success') {
            db = result.data;
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('app-screen').classList.remove('hidden');
            renderDashboard();
        } else { alert('Erro: ' + result.message); logout(); }
    } catch (e) { alert('Falha na conexão. Verifique o link da API.'); logout(); }
}

// === MOTOR DE RENDERIZAÇÃO ===
function renderDashboard() {
    db.contas = db.contas || [];
    db.investimentos = db.investimentos || [];
    db.cartoes = db.cartoes || [];
    db.contasPagar = db.contasPagar || []; 
    db.movimentacoes = db.movimentacoes || [];
    db.cofrinhos = db.cofrinhos || [];
    db.configuracoes = db.configuracoes || []; // Garantindo inicialização

    const saldoTotal = db.contas.reduce((acc, c) => acc + (parseFloat(c.saldo_atual) || 0), 0);
    const invTotal = db.investimentos.reduce((acc, i) => acc + (parseFloat(i.valor_atual) || 0), 0);
    const cartTotal = db.cartoes.reduce((acc, c) => acc + (parseFloat(c.limite_utilizado) || 0), 0);
    const pat = saldoTotal + invTotal - cartTotal;

    if(document.getElementById('card-saldo')) document.getElementById('card-saldo').innerText = formatCurrency(saldoTotal);
    if(document.getElementById('card-investimentos')) document.getElementById('card-investimentos').innerText = formatCurrency(invTotal);
    if(document.getElementById('card-cartoes')) document.getElementById('card-cartoes').innerText = formatCurrency(cartTotal);
    if(document.getElementById('card-patrimonio')) document.getElementById('card-patrimonio').innerText = formatCurrency(pat);

    // Movimentações Dashboard
    const tabMov = document.getElementById('tabela-movimentacoes');
    if(tabMov) tabMov.innerHTML = [...db.movimentacoes].slice(-5).reverse().map(m => `
        <tr class="hover:bg-slate-800/30">
            <td class="p-4">${formatDate(m.data)}</td><td class="p-4">${m.descricao}</td>
            <td class="p-4">${m.categoria}</td><td class="p-4 text-right font-bold ${m.tipo === 'Entrada' ? 'text-emerald-400' : 'text-red-400'}">${m.tipo === 'Entrada' ? '+' : '-'} ${formatCurrency(m.valor)}</td>
        </tr>`).join('');

    // Histórico de Movimentações (Completo)
    const tabelaMovCompleta = document.getElementById('tabela-movimentacoes-completa');
    if (tabelaMovCompleta) {
        tabelaMovCompleta.innerHTML = [...db.movimentacoes].reverse().map(mov => `
            <tr class="hover:bg-slate-800/30 transition-colors">
                <td class="p-4 text-slate-300">${formatDate(mov.data)}</td>
                <td class="p-4 text-white font-medium">${mov.descricao}</td>
                <td class="p-4"><span class="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">${mov.categoria}</span></td>
                <td class="p-4 text-slate-400">${mov.id_conta || '-'}</td>
                <td class="p-4 text-right font-bold ${mov.tipo === 'Entrada' ? 'text-emerald-400' : 'text-red-400'}">${mov.tipo === 'Entrada' ? '+' : '-'} ${formatCurrency(mov.valor)}</td>
            </tr>
        `).join('');
    }

    // Contas a Pagar
    const tabPag = document.getElementById('tabela-contas-pagar');
    if(tabPag) {
        tabPag.innerHTML = db.contasPagar.filter(c => c.status === 'Pendente').map(c => `
        <tr class="hover:bg-slate-800/30 border-b border-slate-700 cursor-pointer" onclick="abrirModalContaPagar('${c.id_conta_pagar}')">
            <td class="p-4">
                <p class="text-white font-medium">${c.descricao} <span class="text-[10px] uppercase bg-slate-700 px-1 rounded">${c.tipo || 'Pagar'}</span></p>
                <p class="text-xs text-slate-400">${formatDate(c.data_vencimento)}</p>
            </td>
            <td class="p-4 ${c.tipo === 'Receber' ? 'text-emerald-400' : 'text-red-400'} font-bold text-right">
                ${c.tipo === 'Receber' ? '+' : '-'} ${formatCurrency(c.valor)}
            </td>
            <td class="p-4 text-right">
                <button onclick="event.stopPropagation(); pagarConta('${c.id_conta_pagar}')" class="bg-emerald-600 px-3 py-1 rounded text-xs font-bold text-white">Pagar</button>
            </td>
        </tr>
        `).join('');
    }

    // Cofrinhos
    const listaCof = document.getElementById('lista-cofrinhos-detalhada');
    if(listaCof) listaCof.innerHTML = db.cofrinhos.length === 0 ? '<p class="text-slate-500 col-span-full text-center py-8">Nenhum cofrinho criado.</p>' : db.cofrinhos.map(cof => {
        let pct = Math.min((parseFloat(cof.valor_atual) / parseFloat(cof.meta)) * 100, 100);
        if (isNaN(pct)) pct = 0;
        let corBarra = pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500';
        return `
            <div class="bg-card p-6 rounded-xl border border-slate-700">
                <div class="flex justify-between mb-4">
                    <h4 class="font-bold text-lg">${cof.nome}</h4>
                    <button onclick="abrirModalCofrinho('${cof.id_cofrinho}')"><i class="ph ph-pencil-simple text-xl"></i></button>
                </div>
                <div class="w-full bg-slate-800 h-2 rounded-full mb-4"><div class="${corBarra} h-2 rounded-full" style="width: ${pct}%"></div></div>
                <p class="text-sm mb-4">${formatCurrency(cof.valor_atual)} / ${formatCurrency(cof.meta)} (${pct.toFixed(1)}%)</p>
                <div class="grid grid-cols-2 gap-2 mt-auto">
                    <button onclick="abrirModalTransacaoCofre('${cof.id_cofrinho}', 'retirada')" class="bg-slate-700 text-red-400 p-2 rounded-lg text-sm font-medium hover:bg-slate-600">Retirar</button>
                    <button onclick="abrirModalTransacaoCofre('${cof.id_cofrinho}', 'aporte')" class="bg-emerald-600 text-white p-2 rounded-lg text-sm font-bold hover:bg-emerald-500">Aportar</button>
                </div>
            </div>`;
    }).join('');

    // Chama o carregamento dos inputs de configurações assim que os dados renderizarem
    carregarConfiguracoes();
}

// === MOVIMENTAÇÕES ===
function abrirModalMovimentacao() { document.getElementById('modal-movimentacao')?.classList.remove('hidden'); }
function fecharModalMovimentacao() { 
    document.getElementById('modal-movimentacao')?.classList.add('hidden'); 
    document.getElementById('form-movimentacao')?.reset();
}

async function salvarMovimentacao(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar');
    if (btn) { btn.innerHTML = 'Salvando...'; btn.disabled = true; }

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
        await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'insertRow', sheet: 'Movimentacoes', email: 'marcilio@example.com', data: novaMovimentacao }) });
        await fetchAllData();
        fecharModalMovimentacao();
    } catch (error) { alert('Falha ao enviar movimentação.'); } 
    finally { if (btn) { btn.innerHTML = 'Salvar Registro'; btn.disabled = false; } }
}

// === FUNÇÕES DE CONTA A PAGAR / RECEBER ===
function abrirModalContaPagar(id = null) {
    const modal = document.getElementById('modal-conta-pagar');
    const form = document.getElementById('form-conta-pagar');
    const btnDeletar = document.getElementById('btn-deletar-conta');
    form.reset();
    
    if (id) {
        const c = db.contasPagar.find(x => x.id_conta_pagar === id);
        document.getElementById('cp-id').value = c.id_conta_pagar;
        document.getElementById('cp-desc').value = c.descricao;
        document.getElementById('cp-valor').value = c.valor;
        document.getElementById('cp-data').value = c.data_vencimento.substring(0, 10);
        document.getElementById('cp-tipo').value = c.tipo || 'Pagar';
        document.getElementById('titulo-modal-conta').innerText = 'Editar Conta';
        btnDeletar.classList.remove('hidden');
    } else {
        document.getElementById('cp-id').value = '';
        document.getElementById('titulo-modal-conta').innerText = 'Nova Conta';
        btnDeletar.classList.add('hidden');
    }
    modal.classList.remove('hidden');
}

function fecharModalContaPagar() { 
    document.getElementById('modal-conta-pagar').classList.add('hidden'); 
}

async function salvarContaPagar(e) {
    e.preventDefault();
    
    const btn = document.getElementById('btn-salvar-conta');
    const originalText = btn.innerText;
    btn.innerHTML = '<i class="ph ph-spinner-gap animate-spin"></i> Salvando...';
    btn.disabled = true;

    const id = document.getElementById('cp-id').value;
    const isEdit = id !== '';
    const dados = {
        descricao: document.getElementById('cp-desc').value,
        valor: parseFloat(document.getElementById('cp-valor').value),
        tipo: document.getElementById('cp-tipo').value,
        data_vencimento: document.getElementById('cp-data').value,
        status: 'Pendente'
    };

    const payload = {
        action: isEdit ? 'updateRow' : 'insertRow',
        sheet: 'ContasPagar',
        email: 'marcilio@example.com',
        data: isEdit ? dados : { id_conta_pagar: 'CP' + Date.now(), ...dados },
        ...(isEdit && { idKey: 'id_conta_pagar', idValue: id })
    };

    try {
        const response = await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            await fetchAllData();
            fecharModalContaPagar();
        } else {
            alert('Erro: ' + result.message);
        }
    } catch(e) { 
        alert('Erro ao salvar conta. Verifique sua conexão.'); 
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function deletarContaPagar() {
    const id = document.getElementById('cp-id').value;
    if (!confirm('Deseja excluir esta conta?')) return;
    
    await fetch(API_URL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'deleteRow', sheet: 'ContasPagar', email: 'marcilio@example.com', idKey: 'id_conta_pagar', idValue: id }) 
    });
    await fetchAllData();
    fecharModalContaPagar();
}

async function pagarConta(idContaPagar) {
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'liquidarConta', email: 'marcilio@example.com', idContaPagar: idContaPagar }) });
        const result = await response.json();
        if (result.status === 'success') {
            await fetchAllData(); 
        } else { alert('Erro: ' + result.message); }
    } catch (error) { alert('Falha na comunicação ao pagar conta.'); }
}

// === AÇÕES DE COFRINHO ===
function abrirModalCofrinho(id = null) {
    const m = document.getElementById('modal-cofrinho');
    document.getElementById('form-cofrinho').reset();
    if(id) {
        const cof = db.cofrinhos.find(c => c.id_cofrinho === id);
        document.getElementById('cof-id').value = cof.id_cofrinho;
        document.getElementById('cof-nome').value = cof.nome;
        document.getElementById('cof-desc').value = cof.descricao;
        document.getElementById('cof-meta').value = cof.meta;
        document.getElementById('cof-atual').value = cof.valor_atual;
        document.getElementById('btn-deletar-cof').classList.remove('hidden');
    } else {
        document.getElementById('cof-id').value = '';
        document.getElementById('btn-deletar-cof').classList.add('hidden');
    }
    m.classList.remove('hidden');
}

function fecharModalCofrinho() { document.getElementById('modal-cofrinho').classList.add('hidden'); }

async function salvarCofrinho(e) {
    e.preventDefault();
    const id = document.getElementById('cof-id').value;
    const isEdit = id !== '';
    const dados = { nome: document.getElementById('cof-nome').value, descricao: document.getElementById('cof-desc').value, meta: parseFloat(document.getElementById('cof-meta').value), valor_atual: parseFloat(document.getElementById('cof-atual').value), id_usuario: 'USR001' };
    
    try {
        await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: isEdit ? 'updateRow' : 'insertRow', sheet: 'Cofrinhos', email: 'marcilio@example.com', data: isEdit ? dados : { id_cofrinho: 'COF'+Date.now(), ...dados }, ...(isEdit && { idKey: 'id_cofrinho', idValue: id }) }) });
        await fetchAllData();
        fecharModalCofrinho();
    } catch(err) { alert('Falha ao salvar cofrinho.'); }
}

async function deletarCofrinho() {
    const id = document.getElementById('cof-id').value;
    if(confirm('Excluir cofrinho?')) {
        try {
            await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteRow', sheet: 'Cofrinhos', email: 'marcilio@example.com', idKey: 'id_cofrinho', idValue: id }) });
            await fetchAllData();
            fecharModalCofrinho();
        } catch(e) { alert('Erro ao excluir cofrinho.'); }
    }
}

// === TRANSAÇÕES DE COFRINHO (Aporte/Retirada) ===
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

function fecharModalTransacaoCofre() { document.getElementById('modal-transacao-cofre').classList.add('hidden'); }

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

    try {
        const payload = { action: 'updateRow', sheet: 'Cofrinhos', email: 'marcilio@example.com', idKey: 'id_cofrinho', idValue: idCof, data: { valor_atual: novoValor } };
        await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        await fetchAllData();
        fecharModalTransacaoCofre();
    } catch(err) { alert('Falha ao processar transação.'); }
    finally { if(btn) { btn.innerText = 'Confirmar'; btn.disabled = false; } }
}

// === MÓDULO: CONFIGURAÇÕES ===

async function salvarMetaPatrimonio(e) {
    e.preventDefault();
    const metaValor = document.getElementById('config-meta-valor').value;
    
    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'updateRow',
                sheet: 'Configuracoes',
                email: 'marcilio@example.com',
                idKey: 'chave',
                idValue: 'meta_patrimonio',
                data: { valor: metaValor }
            })
        });
        alert('Meta atualizada com sucesso!');
        await fetchAllData(); // Atualiza o DB local para refletir a nova meta se necessário
    } catch(e) { alert('Erro ao salvar meta.'); }
}

function carregarConfiguracoes() {
    if (db.configuracoes) {
        const meta = db.configuracoes.find(c => c.chave === 'meta_patrimonio');
        const inputMeta = document.getElementById('config-meta-valor');
        if(meta && inputMeta) inputMeta.value = meta.valor;
    }
}
