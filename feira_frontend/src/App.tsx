
import React, { useEffect, useState } from "react";
import io from "socket.io-client";

type Produto = { id:string, nome:string, preco:number, estoque:number, marca:string, modelo:string };

// Create sockets outside components to avoid reconnects
const clienteSocket = io("http://localhost:4000/cliente");
const vendedorSocket = io("http://localhost:4000/vendedor");

export function ClienteApp() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [clienteNome, setClienteNome] = useState("ClienteDemo");

  useEffect(() => {
    fetch("http://localhost:4000/products").then(r => r.json()).then(setProdutos);

    const onConnect = () => addLog(`Conectado como cliente (${clienteSocket.id})`);
    const onProdutoVendido = (v: any) => {
      addLog(`Produto vendido: ${v.produto.nome} x${v.quantidade} por ${v.clienteNome}`);
      fetch("http://localhost:4000/products").then(r => r.json()).then(setProdutos);
    };
    const onAtualizarEstoque = (payload: any) => {
      addLog(`Estoque atualizado: ${payload.productId} => ${payload.estoque}`);
      fetch("http://localhost:4000/products").then(r => r.json()).then(setProdutos);
    };
    const onFeiraAberta = (f: any) => addLog(`Feira aberta: ${JSON.stringify(f)}`);
    const onFeiraFechada = (f: any) => addLog(`Feira fechada: ${JSON.stringify(f)}`);

    clienteSocket.on("connect", onConnect);
    clienteSocket.on("produtoVendido", onProdutoVendido);
    clienteSocket.on("atualizarEstoque", onAtualizarEstoque);
    clienteSocket.on("feiraAberta", onFeiraAberta);
    clienteSocket.on("feiraFechada", onFeiraFechada);

    return () => {
      clienteSocket.off("connect", onConnect);
      clienteSocket.off("produtoVendido", onProdutoVendido);
      clienteSocket.off("atualizarEstoque", onAtualizarEstoque);
      clienteSocket.off("feiraAberta", onFeiraAberta);
      clienteSocket.off("feiraFechada", onFeiraFechada);
    };
  }, []);

  function addLog(msg: string) {
    setLog(l => [new Date().toLocaleTimeString() + " - " + msg, ...l].slice(0,50));
  }

  function pedirPreco(prodId: string) {
    clienteSocket.emit("valorProduto:request", { productId: prodId });
    clienteSocket.once("valorProduto:response", (resp: any) => {
      if (resp.error) addLog(`Erro preço: ${resp.error}`);
      else addLog(`Preço de ${prodId}: R$ ${resp.preco}`);
    });
  }

  function pedirForaEstoque() {
    clienteSocket.emit("produtoForaEstoque:request");
    clienteSocket.once("produtoForaEstoque:response", (resp: any) => {
      addLog("Produtos fora estoque: " + resp.produtos.map((p: any)=>p.nome).join(", "));
    });
  }

  function venderProduto() {
    if (!selected) return addLog("Selecione um produto");
    const quantidade = 1;
    clienteSocket.emit("produtoVendido", { productId: selected, quantidade, clienteNome, vendedorNome: "VendedorPadrao" });
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Feira — Cliente (porta 3000)</h2>
      <div>
        <label>Seu nome: <input value={clienteNome} onChange={e=>setClienteNome(e.target.value)} /></label>
      </div>
      <h3>Produtos</h3>
      <ul>
        {produtos.map(p=>(
          <li key={p.id} style={{ marginBottom: 8 }}>
            <strong>{p.nome}</strong> — R$ {p.preco} — Estoque: {p.estoque}
            <button style={{ marginLeft: 8 }} onClick={() => { setSelected(p.id); pedirPreco(p.id); }}>Ver preço</button>
            <button style={{ marginLeft: 8 }} onClick={() => { setSelected(p.id); venderProduto(); }}>Comprar 1</button>
          </li>
        ))}
      </ul>

      <div>
        <button onClick={pedirForaEstoque}>Ver produtos fora de estoque</button>
      </div>

      <h3>Log</h3>
      <div style={{ maxHeight: 200, overflow: "auto", background: "#f2f2f2", padding: 8 }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}

export function VendedorApp() {
  const [log, setLog] = useState<string[]>([]);
  const [feira, setFeira] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [vendedorNome, setVendedorNome] = useState("AdminFeira");
  useEffect(() => {
    fetch("http://localhost:4000/products").then(r=>r.json()).then(setProdutos);

    const onConnect = () => addLog(`Conectado vendedor ${vendedorSocket.id}`);
    const onFeiraAberta = (f: any) => { setFeira(f); addLog("Feira aberta: "+JSON.stringify(f)); };
    const onFeiraFechada = (f: any) => { setFeira(null); addLog("Feira fechada"); };
    const onProdutoVendido = (v: any) => addLog(`Venda: ${v.produto.nome} x${v.quantidade} - cliente: ${v.clienteNome}`);
    const onAtualizarEstoque = (p: any) => {
      addLog(`Estoque alterado: ${p.productId} => ${p.estoque}`);
      fetch("http://localhost:4000/products").then(r=>r.json()).then(setProdutos);
    };

    vendedorSocket.on("connect", onConnect);
    vendedorSocket.on("feiraAberta", onFeiraAberta);
    vendedorSocket.on("feiraFechada", onFeiraFechada);
    vendedorSocket.on("produtoVendido", onProdutoVendido);
    vendedorSocket.on("atualizarEstoque", onAtualizarEstoque);

    return () => {
      vendedorSocket.off("connect", onConnect);
      vendedorSocket.off("feiraAberta", onFeiraAberta);
      vendedorSocket.off("feiraFechada", onFeiraFechada);
      vendedorSocket.off("produtoVendido", onProdutoVendido);
      vendedorSocket.off("atualizarEstoque", onAtualizarEstoque);
    };
  }, []);

  function addLog(m: string) {
    setLog(l => [new Date().toLocaleTimeString()+" - "+m, ...l].slice(0,80));
  }

  function abrirFeira() {
    vendedorSocket.emit("feiraAberta:request", { nextAt: null });
  }
  function fecharFeira() {
    vendedorSocket.emit("feiraFechada:request");
  }

  function atualizarEstoque(id: string, q: number) {
    vendedorSocket.emit("atualizarEstoque", { productId: id, novaQuantidade: q });
  }

  function pedirQuantidadeVendas() {
    vendedorSocket.emit("quantidadeVendas:request");
    vendedorSocket.once("quantidadeVendas:response", (resp: any) => {
      addLog(`Total atual: ${resp.atual}, historico ultimas3: ${resp.historicoTotalUltimas3}`);
    });
  }

  function pedirVendasPorMarca() {
    vendedorSocket.emit("vendasPorMarca:request");
    vendedorSocket.once("vendasPorMarca:response", (resp: any) => {
      addLog(`Vendas por marca - atual: ${JSON.stringify(resp.atual)}; historico: ${JSON.stringify(resp.historico)}`);
    });
  }

  function pedirVendasPorModelo() {
    vendedorSocket.emit("vendasPorModelo:request");
    vendedorSocket.once("vendasPorModelo:response", (resp: any) => {
      addLog(`Vendas por modelo - atual: ${JSON.stringify(resp.atual)}; historico: ${JSON.stringify(resp.historico)}`);
    });
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Feira — Vendedor/Admin (porta 3002)</h2>
      <div>
        <label>Seu nome (vendedor): <input value={vendedorNome} onChange={e=>setVendedorNome(e.target.value)} /></label>
      </div>
      <div style={{ marginTop: 12 }}>
        <button onClick={abrirFeira}>Abrir feira</button>
        <button onClick={fecharFeira} style={{ marginLeft: 8 }}>Fechar feira</button>
      </div>

      <h3>Produtos</h3>
      <ul>
        {produtos.map(p => (
          <li key={p.id}>
            {p.nome} — Estoque: {p.estoque} — <button onClick={()=>atualizarEstoque(p.id, p.estoque + 5)}>+5</button>
            <button onClick={()=>atualizarEstoque(p.id, 0)} style={{ marginLeft: 8 }}>Zerar</button>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 12 }}>
        <button onClick={pedirQuantidadeVendas}>Quantidade de vendas</button>
        <button onClick={pedirVendasPorMarca} style={{ marginLeft: 8 }}>Vendas por Marca</button>
        <button onClick={pedirVendasPorModelo} style={{ marginLeft: 8 }}>Vendas por Modelo</button>
      </div>

      <h3>Log</h3>
      <div style={{ maxHeight: 250, overflow: "auto", background: "#f4f4f4", padding: 8 }}>
        {log.map((l,i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}

