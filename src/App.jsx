import React, { useState } from "react";
import { Bike, Mail, Lock, User, Phone, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const SUPABASE_URL = "https://ecjpjrtqekcgidrbfkmo.supabase.co";
const SUPABASE_KEY = "sb_publishable_p-w-9IxOQBUEjCl-vjE-Rw_H0-ePI0m";

export default function CadastroMotorista() {
  const [modo, setModo] = useState("cadastro"); // cadastro | login
  const [etapa, setEtapa] = useState("form"); // form | enviando | sucesso | erro
  const [erroMsg, setErroMsg] = useState("");

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    senha: "",
    placa: "",
    marca: "",
    modelo: "",
    cor: "",
  });

  const atualizar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const cadastrar = async () => {
    setEtapa("enviando");
    setErroMsg("");

    try {
      // 1) Cria o usuário no Supabase Auth (email/senha)
      const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify({ email: form.email, password: form.senha }),
      });

      const signupData = await signupRes.json();

      if (!signupRes.ok) {
        throw new Error(signupData.msg || signupData.error_description || "Erro ao criar conta");
      }

      const userId = signupData.id || signupData.user?.id;

      if (!userId) {
        throw new Error("Conta criada, mas não foi possível obter o ID do usuário.");
      }

      // 2) Cria o registro na tabela `motoristas` vinculado ao user_id
      // Nota: como a confirmação de email ainda não aconteceu, o usuário
      // não tem sessão autenticada ainda — isso só funciona se a policy de
      // insert em `motoristas` permitir insert público controlado, ou se
      // você desabilitar a confirmação de email obrigatória no Supabase
      // (Authentication > Settings) para este teste inicial.
      const motoristaRes = await fetch(`${SUPABASE_URL}/rest/v1/motoristas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          user_id: userId,
          nome: form.nome,
          telefone: form.telefone,
          cnh_foto_url: "pendente",
          moto_placa: form.placa.toUpperCase(),
          moto_marca: form.marca,
          moto_modelo: form.modelo,
          moto_cor: form.cor,
        }),
      });

      if (!motoristaRes.ok) {
        const motoristaErr = await motoristaRes.json();
        throw new Error(motoristaErr.message || "Conta criada, mas o perfil de motorista falhou ao salvar.");
      }

      setEtapa("sucesso");
    } catch (err) {
      setErroMsg(err.message);
      setEtapa("erro");
    }
  };

  const camposValidos =
    form.nome && form.telefone && form.email && form.senha.length >= 6 && form.placa && form.marca && form.cor;

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", maxWidth: 420, margin: "0 auto", background: "#0F1115", color: "#EDEDED", borderRadius: 20, overflow: "hidden" }}>
      <div style={{ padding: "24px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bike size={20} color="#fff" />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>Mototáxi Avaré</p>
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Cadastro de motorista</p>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 24px 24px" }}>
        {etapa === "form" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Campo icon={<User size={15} />} placeholder="Nome completo" value={form.nome} onChange={atualizar("nome")} />
            <Campo icon={<Phone size={15} />} placeholder="Telefone (WhatsApp)" value={form.telefone} onChange={atualizar("telefone")} />
            <Campo icon={<Mail size={15} />} placeholder="Email" type="email" value={form.email} onChange={atualizar("email")} />
            <Campo icon={<Lock size={15} />} placeholder="Senha (mínimo 6 caracteres)" type="password" value={form.senha} onChange={atualizar("senha")} />

            <div style={{ height: 1, background: "#2A2D3A", margin: "8px 0" }} />
            <p style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 4px" }}>Dados da moto</p>

            <div style={{ display: "flex", gap: 10 }}>
              <Campo placeholder="Placa" value={form.placa} onChange={atualizar("placa")} style={{ flex: 1 }} />
              <Campo placeholder="Cor" value={form.cor} onChange={atualizar("cor")} style={{ flex: 1 }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Campo placeholder="Marca (ex: Honda)" value={form.marca} onChange={atualizar("marca")} style={{ flex: 1 }} />
              <Campo placeholder="Modelo (ex: CG 160)" value={form.modelo} onChange={atualizar("modelo")} style={{ flex: 1 }} />
            </div>

            <p style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.5, marginTop: 4 }}>
              Foto da CNH será solicitada em uma etapa futura — ainda não está incluída neste formulário.
            </p>

            <button
              onClick={cadastrar}
              disabled={!camposValidos}
              style={{
                marginTop: 8,
                background: camposValidos ? "#7C3AED" : "#2A2D3A",
                color: camposValidos ? "#fff" : "#6B7280",
                border: "none",
                borderRadius: 12,
                padding: 14,
                fontSize: 14,
                fontWeight: 600,
                cursor: camposValidos ? "pointer" : "not-allowed",
              }}
            >
              Criar cadastro
            </button>
          </div>
        )}

        {etapa === "enviando" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Loader2 size={28} color="#7C3AED" className="spin" />
            <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 12 }}>Criando sua conta...</p>
            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {etapa === "sucesso" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <CheckCircle2 size={40} color="#22C55E" />
            <p style={{ fontWeight: 600, fontSize: 15, marginTop: 12 }}>Cadastro criado</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6, lineHeight: 1.6 }}>
              Um email de confirmação foi enviado para <strong style={{ color: "#D1D5DB" }}>{form.email}</strong>. Confirme o email antes de tentar fazer login.
            </p>
          </div>
        )}

        {etapa === "erro" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <AlertCircle size={40} color="#EF4444" />
            <p style={{ fontWeight: 600, fontSize: 15, marginTop: 12 }}>Não foi possível cadastrar</p>
            <p style={{ fontSize: 12, color: "#EF4444", marginTop: 6, lineHeight: 1.6 }}>{erroMsg}</p>
            <button
              onClick={() => setEtapa("form")}
              style={{ marginTop: 16, background: "transparent", color: "#D1D5DB", border: "1px solid #2A2D3A", borderRadius: 12, padding: "10px 20px", fontSize: 13, cursor: "pointer" }}
            >
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
      <input
        {...props}
        style={{ background: "transparent", border: "none", outline: "none", color: "#EDEDED", fontSize: 13, width: "100%" }}
      />
    </div>
  );
}
