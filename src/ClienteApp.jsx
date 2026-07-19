import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin, Navigation, Search, User, Mail, Lock, Phone, Loader2, CheckCircle2, AlertCircle, Radio } from "lucide-react";
import "leaflet/dist/leaflet.css";

const SUPABASE_URL = "https://ecjpjrtqekcgidrbfkmo.supabase.co";
const SUPABASE_KEY = "sb_publishable_p-w-9IxOQBUEjCl-vjE-Rw_H0-ePI0m";

// Centro aproximado de Avaré-SP
const AVARE_CENTER = [-23.0995, -48.9251];

// Ícone customizado do marcador (o padrão do Leaflet não carrega bem via CDN)
const iconeMarcador = new L.DivIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#7C3AED;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const iconeDestino = new L.DivIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#22C55E;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function ClienteApp() {
  const [sessao, setSessao] = useState(null); // { userId, accessToken, clienteId }
  const [autenticando, setAutenticando] = useState(true);

  useEffect(() => {
    // Verifica se já existe sessão salva (simplificado: sem persistência real por enquanto)
    setAutenticando(false);
  }, []);

  if (autenticando) {
    return (
      <div style={containerStyle}>
        <Loader2 size={28} color="#7C3AED" className="spin" />
        <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!sessao) {
    return <AuthCliente onAutenticado={setSessao} />;
  }

  return <PedirCorrida sessao={sessao} />;
}

// ============================================================
// AUTENTICAÇÃO DO CLIENTE (mesmo padrão validado no cadastro de motorista)
// ============================================================
function AuthCliente({ onAutenticado }) {
  const [modo, setModo] = useState("cadastro");
  const [etapa, setEtapa] = useState("form");
  const [erroMsg, setErroMsg] = useState("");
  const [form, setForm] = useState({ nome: "", telefone: "", email: "", senha: "" });

  const atualizar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const criarPerfilSeNaoExistir = async (userId, accessToken) => {
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/clientes?user_id=eq.${userId}&select=id`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
    });
    const existentes = await checkRes.json();

    if (existentes.length > 0) {
      return existentes[0].id;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/clientes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${accessToken}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({ user_id: userId, nome: form.nome, telefone: form.telefone }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Falha ao criar perfil de cliente");
    }
    const criado = await res.json();
    return criado[0].id;
  };

  const cadastrar = async () => {
    setEtapa("enviando");
    setErroMsg("");
    try {
      const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({ email: form.email, password: form.senha }),
      });
      const signupData = await signupRes.json();
      if (!signupRes.ok) throw new Error(signupData.msg || signupData.error_description || "Erro ao criar conta");

      const userId = signupData.id || signupData.user?.id;
      const accessToken = signupData.access_token;
      if (!accessToken) {
        throw new Error("Conta criada, mas sem sessão ativa. Confirme o email pendente no Supabase (auth.users) antes de tentar login.");
      }

      const clienteId = await criarPerfilSeNaoExistir(userId, accessToken);
      onAutenticado({ userId, accessToken, clienteId });
    } catch (err) {
      setErroMsg(err.message);
      setEtapa("erro");
    }
  };

  const entrar = async () => {
    setEtapa("enviando");
    setErroMsg("");
    try {
      const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({ email: form.email, password: form.senha }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData.error_description || loginData.msg || "Email ou senha incorretos");

      const userId = loginData.user?.id;
      const accessToken = loginData.access_token;
      const clienteId = await criarPerfilSeNaoExistir(userId, accessToken);
      onAutenticado({ userId, accessToken, clienteId });
    } catch (err) {
      setErroMsg(err.message);
      setEtapa("erro");
    }
  };

  const camposValidosCadastro = form.nome && form.telefone && form.email && form.senha.length >= 6;
  const camposValidosLogin = form.email && form.senha;

  return (
    <div style={{ ...containerStyle, alignItems: "stretch", justifyContent: "flex-start", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MapPin size={20} color="#fff" />
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>Mototáxi Avaré</p>
          <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>{modo === "cadastro" ? "Cadastro de cliente" : "Login de cliente"}</p>
        </div>
      </div>

      {etapa === "form" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={() => setModo("cadastro")} style={{ flex: 1, padding: 8, borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: modo === "cadastro" ? "#7C3AED" : "#1A1D29", color: modo === "cadastro" ? "#fff" : "#9CA3AF" }}>
              Criar cadastro
            </button>
            <button onClick={() => setModo("login")} style={{ flex: 1, padding: 8, borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: modo === "login" ? "#7C3AED" : "#1A1D29", color: modo === "login" ? "#fff" : "#9CA3AF" }}>
              Já tenho conta
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {modo === "cadastro" && (
              <>
                <Campo icon={<User size={15} />} placeholder="Nome completo" value={form.nome} onChange={atualizar("nome")} />
                <Campo icon={<Phone size={15} />} placeholder="Telefone" value={form.telefone} onChange={atualizar("telefone")} />
              </>
            )}
            <Campo icon={<Mail size={15} />} placeholder="Email" type="email" value={form.email} onChange={atualizar("email")} />
            <Campo icon={<Lock size={15} />} placeholder="Senha" type="password" value={form.senha} onChange={atualizar("senha")} />

            <button
              onClick={modo === "cadastro" ? cadastrar : entrar}
              disabled={modo === "cadastro" ? !camposValidosCadastro : !camposValidosLogin}
              style={{
                marginTop: 8,
                background: (modo === "cadastro" ? camposValidosCadastro : camposValidosLogin) ? "#7C3AED" : "#2A2D3A",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: 14,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {modo === "cadastro" ? "Criar cadastro" : "Entrar"}
            </button>
          </div>
        </>
      )}

      {etapa === "enviando" && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Loader2 size={28} color="#7C3AED" className="spin" />
          <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {etapa === "erro" && (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <AlertCircle size={40} color="#EF4444" />
          <p style={{ fontSize: 12, color: "#EF4444", marginTop: 10, lineHeight: 1.6 }}>{erroMsg}</p>
          <button onClick={() => setEtapa("form")} style={{ marginTop: 16, background: "transparent", color: "#D1D5DB", border: "1px solid #2A2D3A", borderRadius: 12, padding: "10px 20px", fontSize: 13, cursor: "pointer" }}>
            Tentar de novo
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TELA DE PEDIR CORRIDA — mapa + busca de destino + status
// ============================================================
function RecentralizarMapa({ origem }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(origem, map.getZoom());
  }, [origem]);
  return null;
}

function PedirCorrida({ sessao }) {
  const [origem, setOrigem] = useState(AVARE_CENTER);
  const [statusLocalizacao, setStatusLocalizacao] = useState("buscando"); // buscando | real | negada
  const [destino, setDestino] = useState(null);
  const [buscaTexto, setBuscaTexto] = useState("");
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [etapaCorrida, setEtapaCorrida] = useState("escolhendo"); // escolhendo | buscando_motorista | erro
  const [erroMsg, setErroMsg] = useState("");
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatusLocalizacao("negada");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigem([pos.coords.latitude, pos.coords.longitude]);
        setStatusLocalizacao("real");
      },
      () => {
        setStatusLocalizacao("negada");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Busca de endereço via Nominatim (OpenStreetMap) — gratuito, sem chave de API
  const buscarEndereco = (texto) => {
    setBuscaTexto(texto);
    clearTimeout(debounceRef.current);
    if (texto.length < 4) {
      setResultadosBusca([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const query = encodeURIComponent(`${texto}, Avaré, SP, Brasil`);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5`);
        const data = await res.json();
        setResultadosBusca(data);
      } catch {
        setResultadosBusca([]);
      }
    }, 500);
  };

  const selecionarResultado = (r) => {
    setDestino([parseFloat(r.lat), parseFloat(r.lon)]);
    setBuscaTexto(r.display_name);
    setResultadosBusca([]);
  };

  const [corridaId, setCorridaId] = useState(null);
  const [motoristaAceito, setMotoristaAceito] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!corridaId || etapaCorrida !== "buscando_motorista") return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/corridas?id=eq.${corridaId}&select=status,motorista_id,motoristas(nome,moto_placa,moto_marca,moto_modelo,moto_cor,avaliacao_media)`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${sessao.accessToken}` } }
        );
        const data = await res.json();
        if (data[0] && data[0].status === "aceito") {
          setMotoristaAceito(data[0].motoristas);
          setEtapaCorrida("aceito");
          clearInterval(pollRef.current);
        }
      } catch {
        // silencioso: próxima tentativa do polling cobre falhas pontuais de rede
      }
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [corridaId, etapaCorrida]);

  const pedirCorrida = async () => {
    if (!destino) return;
    setEtapaCorrida("buscando_motorista");
    setErroMsg("");
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/corridas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${sessao.accessToken}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          cliente_id: sessao.clienteId,
          origem_lat: origem[0],
          origem_lng: origem[1],
          origem_endereco: "Localização atual (Avaré)",
          destino_lat: destino[0],
          destino_lng: destino[1],
          destino_endereco: buscaTexto,
          status: "buscando",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Não foi possível pedir a corrida");
      }

      const criada = await res.json();
      setCorridaId(criada[0].id);
    } catch (err) {
      setErroMsg(err.message);
      setEtapaCorrida("erro");
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: 600, maxWidth: 420, margin: "0 auto", borderRadius: 20, overflow: "hidden", background: "#0F1115" }}>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 1000, padding: 16 }}>
        <div style={{ background: "#7C3AED", color: "#fff", padding: "8px 16px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
          <MapPin size={14} /> Mototáxi Avaré
        </div>
        {statusLocalizacao === "buscando" && (
          <div style={{ marginTop: 8, background: "#1A1D29", color: "#9CA3AF", padding: "6px 12px", borderRadius: 16, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11 }}>
            <Loader2 size={12} className="spin" /> Localizando você...
          </div>
        )}
        {statusLocalizacao === "negada" && (
          <div style={{ marginTop: 8, background: "#1A1D29", color: "#F59E0B", padding: "6px 12px", borderRadius: 16, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11 }}>
            <AlertCircle size={12} /> Localização indisponível — usando centro de Avaré
          </div>
        )}
      </div>

      <MapContainer center={origem} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
        <RecentralizarMapa origem={origem} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <Marker position={origem} icon={iconeMarcador} />
        {destino && <Marker position={destino} icon={iconeDestino} />}
        {destino && <Polyline positions={[origem, destino]} pathOptions={{ color: "#7C3AED", weight: 3, dashArray: "6 6" }} />}
      </MapContainer>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#1A1D29", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, zIndex: 1000, maxHeight: "70vh", overflowY: "auto" }}>
        {etapaCorrida === "escolhendo" && (
          <>
            <div style={{ position: "relative", marginBottom: destino ? 12 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#0F1115", border: "1px solid #2A2D3A", borderRadius: 10, padding: "10px 12px" }}>
                <Search size={15} color="#6B7280" />
                <input
                  value={buscaTexto}
                  onChange={(e) => buscarEndereco(e.target.value)}
                  placeholder="Para onde vamos?"
                  style={{ background: "transparent", border: "none", outline: "none", color: "#EDEDED", fontSize: 13, width: "100%" }}
                />
              </div>
              {resultadosBusca.length > 0 && (
                <div style={{ position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0, background: "#1A1D29", border: "1px solid #2A2D3A", borderRadius: 10, overflow: "hidden", zIndex: 1001, maxHeight: 220, overflowY: "auto" }}>
                  {resultadosBusca.map((r, i) => (
                    <div
                      key={i}
                      onClick={() => selecionarResultado(r)}
                      style={{ padding: 12, fontSize: 12, color: "#D1D5DB", cursor: "pointer", borderBottom: i < resultadosBusca.length - 1 ? "1px solid #2A2D3A" : "none" }}
                    >
                      {r.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {destino && (
              <button
                onClick={pedirCorrida}
                style={{ width: "100%", background: "#7C3AED", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Chamar mototáxi
              </button>
            )}
          </>
        )}

        {etapaCorrida === "buscando_motorista" && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <Radio size={26} color="#7C3AED" className="pulse" />
            <p style={{ fontWeight: 600, fontSize: 14, marginTop: 10 }}>Buscando motorista...</p>
            <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>Corrida registrada. Aguardando um motorista aceitar.</p>
            <style>{`.pulse { animation: pulse 1.2s ease-in-out infinite; } @keyframes pulse { 0%,100% { opacity:1; transform:scale(1);} 50% {opacity:.5; transform:scale(1.15);} } .spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {etapaCorrida === "aceito" && motoristaAceito && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, color: "#22C55E" }}>
              <CheckCircle2 size={16} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Motorista a caminho</span>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#7C3AED22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Navigation size={20} color="#7C3AED" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{motoristaAceito.nome}</p>
                <p style={{ fontSize: 12, color: "#9CA3AF", margin: "2px 0 0" }}>
                  {motoristaAceito.moto_marca} {motoristaAceito.moto_modelo} · {motoristaAceito.moto_cor}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontWeight: 700, fontSize: 15, margin: 0, letterSpacing: 0.5 }}>{motoristaAceito.moto_placa}</p>
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>★ {motoristaAceito.avaliacao_media}</p>
              </div>
            </div>
          </div>
        )}

        {etapaCorrida === "erro" && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <AlertCircle size={24} color="#EF4444" />
            <p style={{ fontSize: 12, color: "#EF4444", marginTop: 8 }}>{erroMsg}</p>
            <button onClick={() => setEtapaCorrida("escolhendo")} style={{ marginTop: 12, background: "transparent", color: "#D1D5DB", border: "1px solid #2A2D3A", borderRadius: 10, padding: "8px 16px", fontSize: 12, cursor: "pointer" }}>
              Tentar de novo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Campo({ icon, style, ...props }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1A1D29", border: "1px solid #2A2D3A", borderRadius: 10, padding: "10px 12px", ...style }}>
      {icon && <span style={{ color: "#6B7280", display: "flex" }}>{icon}</span>}
      <input {...props} style={{ background: "transparent", border: "none", outline: "none", color: "#EDEDED", fontSize: 13, width: "100%" }} />
    </div>
  );
}

const containerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 400,
  maxWidth: 420,
  margin: "0 auto",
  background: "#0F1115",
  color: "#EDEDED",
  borderRadius: 20,
  fontFamily: "'Inter', -apple-system, sans-serif",
};
export default ClienteApp;
