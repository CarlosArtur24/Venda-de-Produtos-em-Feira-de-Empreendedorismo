import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ClienteApp, VendedorApp } from "./App";

function Main() {
	const [mode, setMode] = useState<"cliente"|"vendedor">("cliente");
	return (
		<>
			<div style={{margin: 10}}>
				<button onClick={()=>setMode("cliente")}>Cliente</button>
				<button onClick={()=>setMode("vendedor")} style={{marginLeft:8}}>Vendedor/Admin</button>
			</div>
			{mode === "cliente" ? <ClienteApp /> : <VendedorApp />}
		</>
	);
}

createRoot(document.getElementById("root")!).render(<Main />);
