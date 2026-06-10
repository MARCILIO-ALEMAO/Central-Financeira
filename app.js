// Substitua pela chave que você me enviou
const API_URL = 'https://script.google.com/macros/s/AKfycbxn-dylgW67tQWbSL2MhkoaERR3EMBIA-tOVXwTLwrP0Y0PK02jG6KK8n9VryIZf-3jdQ/exec';

// Configuração do Google Login
// NOTA: Para funcionar 100%, você precisará criar um Client ID no Google Cloud Console depois.
// Por enquanto, faremos um bypass visual apenas para validar a transição de telas.
window.onload = function () {
    // Simula a inicialização do botão (Na fase final colocaremos seu Client ID aqui)
    const buttonDiv = document.getElementById("buttonDiv");
    buttonDiv.innerHTML = `
        <button onclick="handleCredentialResponse({credential: 'simulated_token'})" class="bg-white text-slate-800 font-medium py-2 px-4 rounded flex items-center gap-2 hover:bg-slate-100 transition">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-5 h-5" alt="Google">
            Entrar com Google
        </button>
    `;
};

// Função executada após o login
function handleCredentialResponse(response) {
    console.log("Token recebido (simulado):", response.credential);
    
    // Oculta login e mostra o app
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    
    // Inicia a busca de dados da sua planilha
    fetchDashboardData();
}

function logout() {
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
}

// Testa a conexão com a sua API
async function fetchDashboardData() {
    try {
        // Buscando dados de teste (Aba Contas)
        const response = await fetch(`${API_URL}?action=getSheet&sheet=Contas&email=marcilio@example.com`);
        const result = await response.json();
        
        console.log("Conexão com a Planilha OK!", result);
        // Na próxima fase, injetaremos esses dados no HTML!
    } catch (error) {
        console.error("Erro ao conectar com a API:", error);
    }
}