import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // em dev, liberar. Em prod restrinja.
});

// --- Estado em memória (exemplo simples) ---
let feiras = []; // histórico de feiras
let feiraAtiva = null; // { id, startedAt, nextAt, vendas: [] }
let products = [
  // exemplo
  { id: "p1", nome: "Camiseta XYZ", marca: "MarcaA", modelo: "M", preco: 50.0, estoque: 10, vendidos: 0 },
  { id: "p2", nome: "Caneca Legal", marca: "MarcaB", modelo: "C1", preco: 25.0, estoque: 0, vendidos: 0 },
];

// helper
function calcularHistoricoVendas(ultimasN = 3) {
  // pega últimas N feiras e soma itens vendidos
  const last = feiras.slice(-ultimasN);
  const resumo = { totalItens: 0, porMarca: {}, porModelo: {} };
  for (const f of last) {
    for (const v of f.vendas || []) {
      resumo.totalItens += v.quantidade;
      const prod = v.produto;
      resumo.porMarca[prod.marca] = (resumo.porMarca[prod.marca] || 0) + v.quantidade;
      resumo.porModelo[prod.modelo] = (resumo.porModelo[prod.modelo] || 0) + v.quantidade;
    }
  }
  return resumo;
}

// NAMESPACES: /cliente e /vendedor
const clienteNs = io.of("/cliente");
const vendedorNs = io.of("/vendedor");

// conexão cliente
clienteNs.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  // quando cliente pede valor do produto
  socket.on("valorProduto:request", (payload) => {
    const { productId } = payload;
    const p = products.find(x => x.id === productId);
    socket.emit("valorProduto:response", { productId, preco: p ? p.preco : null, error: p?null:"Produto não encontrado" });
  });

  socket.on("produtoForaEstoque:request", () => {
    const fora = products.filter(p => p.estoque <= 0);
    socket.emit("produtoForaEstoque:response", { produtos: fora });
  });

  socket.on("feiraAberta:request", () => {
    if (feiraAtiva) {
      socket.emit("feiraAberta", { alreadyOpen: true, feira: feiraAtiva });
    } else {
      socket.emit("feiraAberta", { alreadyOpen: false });
    }
  });

  // venda informada pelo cliente (ex: cliente confirma compra)
  socket.on("produtoVendido", (payload) => {
    // payload: { productId, quantidade, clienteNome, vendedorNome }
    if (!feiraAtiva) {
      socket.emit("error", { msg: "Nenhuma feira ativa." });
      return;
    }
    const p = products.find(x => x.id === payload.productId);
    if (!p) {
      socket.emit("error", { msg: "Produto não encontrado." });
      return;
    }
    if (p.estoque < payload.quantidade) {
      socket.emit("error", { msg: "Estoque insuficiente." });
      return;
    }

    p.estoque -= payload.quantidade;
    p.vendidos += payload.quantidade;

    const venda = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      produto: { id: p.id, nome: p.nome, marca: p.marca, modelo: p.modelo },
      quantidade: payload.quantidade,
      clienteNome: payload.clienteNome || "Anon",
      vendedorNome: payload.vendedorNome || "Vendedor",
      when: new Date().toISOString()
    };

    feiraAtiva.vendas.push(venda);

    // broadcast pra vendedor (namespace vendedor) e também para todos clientes
    vendedorNs.emit("produtoVendido", venda);
    clienteNs.emit("produtoVendido", venda);

    // também enviar atualização de estoque
    vendedorNs.emit("atualizarEstoque", { productId: p.id, estoque: p.estoque });
    clienteNs.emit("atualizarEstoque", { productId: p.id, estoque: p.estoque });
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

// conexão vendedor/admin
vendedorNs.on("connection", (socket) => {
  console.log("Vendedor conectado:", socket.id);

  // abrir feira
  socket.on("feiraAberta:request", (payload) => {
    // payload: { nextAt? }
    if (feiraAtiva) {
      socket.emit("feiraAberta", { alreadyOpen: true, feira: feiraAtiva });
      return;
    }
    const nova = { id: `${Date.now()}`, startedAt: new Date().toISOString(), nextAt: payload?.nextAt || null, vendas: [] };
    feiraAtiva = nova;
    vendedorNs.emit("feiraAberta", nova);
    clienteNs.emit("feiraAberta", nova);
  });

  // fechar feira
  socket.on("feiraFechada:request", () => {
    if (!feiraAtiva) {
      socket.emit("error", { msg: "Nenhuma feira ativa" });
      return;
    }
    feiraAtiva.closedAt = new Date().toISOString();
    feiras.push(feiraAtiva);
    vendedorNs.emit("feiraFechada", feiraAtiva);
    clienteNs.emit("feiraFechada", feiraAtiva);
    feiraAtiva = null;
  });

  // atualizar estoque (admin)
  socket.on("atualizarEstoque", (payload) => {
    // payload: { productId, novaQuantidade }
    const p = products.find(x => x.id === payload.productId);
    if (!p) {
      socket.emit("atualizarEstoque:ack", { ok: false, msg: "Produto não encontrado" });
      return;
    }
    p.estoque = payload.novaQuantidade;
    vendedorNs.emit("atualizarEstoque", { productId: p.id, estoque: p.estoque });
    clienteNs.emit("atualizarEstoque", { productId: p.id, estoque: p.estoque });
    socket.emit("atualizarEstoque:ack", { ok: true, productId: p.id, estoque: p.estoque });
  });

  // pedidos de relatórios
  socket.on("quantidadeVendas:request", () => {
    const atual = feiraAtiva ? feiraAtiva.vendas.reduce((s,v)=>s+v.quantidade,0) : 0;
    const historico = calcularHistoricoVendas(3);
    socket.emit("quantidadeVendas:response", { atual, historicoTotalUltimas3: historico.totalItens });
  });

  socket.on("vendasPorMarca:request", () => {
    const atual = {};
    if (feiraAtiva) {
      for (const v of feiraAtiva.vendas) {
        atual[v.produto.marca] = (atual[v.produto.marca]||0) + v.quantidade;
      }
    }
    const historico = calcularHistoricoVendas(3).porMarca;
    socket.emit("vendasPorMarca:response", { atual, historico });
  });

  socket.on("vendasPorModelo:request", () => {
    const atual = {};
    if (feiraAtiva) {
      for (const v of feiraAtiva.vendas) {
        atual[v.produto.modelo] = (atual[v.produto.modelo]||0) + v.quantidade;
      }
    }
    const historico = calcularHistoricoVendas(3).porModelo;
    socket.emit("vendasPorModelo:response", { atual, historico });
  });

  socket.on("disconnect", () => {
    console.log("Vendedor desconectado:", socket.id);
  });
});

// endpoints simples para debug
app.get("/products", (req, res) => res.json(products));
app.get("/feira", (req, res) => res.json({ feiraAtiva, feiras }));

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server rodando na porta ${PORT}`));
