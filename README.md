# 🧾 Feira de Empreendedorismo — Event-driven Programming

Aplicação em tempo real que simula uma **feira de empreendedorismo**, permitindo interação simultânea entre **clientes** e **vendedores**.  
Toda a lógica do sistema é controlada através de **eventos WebSocket**, sem necessidade de recarregar a página.

---

## 🧰 Stack do Projeto

| 🧭 **Categoria**                | 🧠 **Tecnologia**                                |
|-------------------------------|-------------------------------------------------|
| 🕹️ Runtime                    | [Node.js](https://nodejs.org/)                  |
| 🧱 Framework                  | [Express](https://expressjs.com/)               |
| 📡 Comunicação em tempo real | [Socket.IO](https://socket.io/)                 |
| 🖥️ Frontend                   | React + TypeScript                              |
| 💡 Paradigma                  | Event-Driven Programming                        |

---

## 🪄 Estrutura do Projeto

feira-eventos/
├─ server/ # Backend Node.js (porta 4000)
│ ├─ index.js
│ ├─ package.json
│ └─ ...
├─ client/ # Frontend Cliente (porta 3000)
│ ├─ src/
│ ├─ package.json
│ └─ ...
└─ vendor/ # Frontend Vendedor/Admin (porta 3002)
├─ src/
├─ package.json
└─ ...


---

## ⚡ Principais Eventos

| Evento                    | Origem                 | Destino               | Descrição                                                                 |
|----------------------------|-------------------------|-------------------------|------------------------------------------------------------------------------|
| `atualizarEstoque`         | Admin                  | Todos                  | Atualiza estoque de um produto em tempo real.                               |
| `valorProduto`             | Cliente                | Servidor → Cliente     | Mostra ao cliente o preço do produto.                                       |
| `produtoForaEstoque`       | Cliente                | Servidor               | Lista produtos fora de estoque.                                            |
| `feiraAberta`              | Admin                  | Todos                  | Indica início da feira e datas associadas.                                 |
| `feiraFechada`            | Admin                  | Todos                  | Indica o encerramento da feira atual.                                     |
| `produtoVendido`          | Cliente                | Todos                  | Atualiza venda e sincroniza estoque em tempo real.                          |
| `vendedorNome`            | Servidor               | Cliente                | Mostra o nome do vendedor que realizou a venda.                            |
| `clienteNome`            | Servidor               | Vendedor               | Mostra o nome do cliente atendido.                                        |
| `quantidadeVendas`       | Vendedor ↔ Servidor    | Vendedor               | Exibe total de vendas na feira atual e nas últimas 3 feiras.               |
| `vendasPorMarca`         | Vendedor ↔ Servidor    | Vendedor               | Exibe estatísticas de vendas por marca.                                    |
| `vendasPorModelo`        | Vendedor ↔ Servidor    | Vendedor               | Exibe estatísticas de vendas por modelo.                                   |

---

## 🚀 Como Rodar o Projeto

### 🧭 1. Clonar o repositório

```bash
git clone https://github.com/SEU_USUARIO/feira-eventos.git
cd feira-eventos

🖥️ 2. Iniciar o servidor (porta 4000)

cd server
npm install
npm start
# Servidor rodando em http://localhost:4000


👤 3. Iniciar o frontend do Cliente (porta 3000)

cd ../client
npm install
npm run dev -- --port 3000
# Cliente acessa http://localhost:3000


🧑‍💼 4. Iniciar o frontend do Vendedor/Admin (porta 3002)

cd ../vendor
npm install
npm run dev -- --port 3002
# Vendedor acessa http://localhost:3002


🧠 Fluxo de Eventos

Admin abre a feira → feiraAberta é emitido para todos.

Clientes visualizam produtos, preços e estoques em tempo real.

Cliente realiza compra → produtoVendido → servidor atualiza estoque + notifica todos.

Admin visualiza relatórios de vendas (quantidadeVendas, vendasPorMarca, vendasPorModelo).

Admin encerra a feira → feiraFechada → todos são notificados.


🧰 Padronização de Quebra de Linha (Git)

Crie um arquivo .gitattributes na raiz:

* text=auto eol=lf

Ou configure globalmente:

git config core.autocrlf false


