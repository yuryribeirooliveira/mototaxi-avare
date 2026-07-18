import React, { useState } from "react";
import { Bike, MapPin } from "lucide-react";
import ClienteApp from "./ClienteApp.jsx";
import MotoristaApp from "./MotoristaApp.jsx";

export default function App() {
  const [lado, setLado] = useState(null); // null | "cliente" | "motorista"

  if (lado === "cliente") return <ClienteApp />;
  if (lado === "motorista") return <MotoristaApp />;

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", maxWidth: 420, margin: "0 auto", background: "#0F1115", color: "#EDEDED", borderRadius: 20, padding: 32, textAlign: "center" }}>
      <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Mototáxi Avaré</p>
      <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 28 }}>Ambiente de teste — escolha o que testar</p>

      <button
        onClick={() => setLado("cliente")}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: "#1A1D29", border: "1px solid #2A2D3A", borderRadius: 14, padding: 18, marginBottom: 12, cursor: "pointer", color: "#EDEDED" }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#7C3AED22", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MapPin size={20} color="#7C3AED" />
        </div>
        <div style={{ textAlign: "left" }}>
          <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>Sou cliente</p>
          <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Pedir uma corrida</p>
        </div>
      </button>

      <button
        onClick={() => setLado("motorista")}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: "#1A1D29", border: "1px solid #2A2D3A", borderRadius: 14, padding: 18, cursor: "pointer", color: "#EDEDED" }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#7C3AED22", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Bike size={20} color="#7C3AED" />
        </div>
        <div style={{ textAlign: "left" }}>
          <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>Sou motorista</p>
          <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Cadastro / login</p>
        </div>
      </button>
    </div>
  );
}
