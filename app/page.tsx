'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

type Vehicle = {
  id: string;
  tag: string;
  plate: string;
  name: string;
  status: string;
  created_at?: string;
};

type AccessRow = {
  id: string;
  created_at?: string;
  tag: string;
  plate: string;
  name: string;
  action: string;
  result: string;
  operator_name?: string | null;
};

const MODES = ['Entrada', 'Saída'] as const;
type Mode = (typeof MODES)[number];

export default function Page() {
  // CONFIGURAÇÃO DE ACESSO
  const ADMIN_EMAILS = ['valdir.santos@mercadolivre.com'];

  const [userRole, setUserRole] = useState<'admin' | 'porteiro'>('porteiro');
  const [mode, setMode] = useState<Mode>('Entrada');
  const [tagInput, setTagInput] = useState('');
  const [plateInput, setPlateInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [accesses, setAccesses] = useState<AccessRow[]>([]);
  const [scanMsg, setScanMsg] = useState('Aguardando validação...');
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [operatorName, setOperatorName] = useState('Operador');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('Sua Empresa');

  function resolveRole(email?: string | null) {
    const userEmail = (email || '').toLowerCase();
    return ADMIN_EMAILS.includes(userEmail) ? 'admin' : 'porteiro';
  }

  useEffect(() => {
    setCompanyName(process.env.NEXT_PUBLIC_COMPANY_NAME || 'Sua Empresa');
    const init = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setAuthReady(true);
        return;
      }
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      
      if (session) {
        setSignedIn(true);
        setOperatorName(session.user.email?.split('@')[0] || 'Operador');
        const role = resolveRole(session.user.email);
        setUserRole(role);
        
        // Carrega dados iniciais
        await loadVehicles();
        await loadAccesses();
      }
      setAuthReady(true);
    };
    init();
  }, []);

  async function loadVehicles() {
    if (!supabase) return;
    const { data } = await supabase.from('vehicles').select('*').order('name', { ascending: true });
    setVehicles((data as Vehicle[]) || []);
  }

  async function loadAccesses() {
    if (!supabase) return;
    const { data } = await supabase.from('access_logs').select('*').order('created_at', { ascending: false });
    setAccesses((data as AccessRow[]) || []);
  }

  function normalize(value: string) {
    return String(value || '').trim().toUpperCase();
  }

  async function validate() {
    const tag = normalize(tagInput);
    if (!supabase) return;

    const { data, error } = await supabase.from('vehicles').select('*').eq('tag', tag).maybeSingle();

    if (!data) {
      setScanMsg('❌ Tag não cadastrada');
      return;
    }

    if (data.status === 'Bloqueado') {
      setScanMsg('🚫 Acesso bloqueado');
      return;
    }

    setScanMsg(`✅ Acesso liberado: ${data.name}`);

    await supabase.from('access_logs').insert({
      tag,
      plate: data.plate,
      name: data.name,
      action: mode,
      result: 'Autorizado',
      operator_name: operatorName
    });
    
    await loadAccesses(); // Atualiza log após validar
  }

  async function signIn() {
    if (!supabase) return;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert('Erro ao entrar: ' + error.message);
      return;
    }
    if (data.session) {
      window.location.reload(); // Recarrega para aplicar estados iniciais
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSignedIn(false);
    window.location.reload();
  }

  if (!authReady) return <div style={{ padding: '20px' }}>Carregando sistema...</div>;

  if (!signedIn) {
    return (
      <div style={{ padding: '40px', maxWidth: '400px', margin: 'auto' }}>
        <h2>{companyName} - Login</h2>
        <input style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '10px' }} type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} />
        <input style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '10px' }} type="password" placeholder="Senha" onChange={e => setPassword(e.target.value)} />
        <button style={{ width: '100%', padding: '10px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '5px' }} onClick={signIn}>Entrar</button>
      </div>
    );
  }

  // --- INTERFACE PORTEIRO ---
  if (userRole === 'porteiro') {
    return (
      <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h2>Portaria - {companyName}</h2>
          <button onClick={signOut}>Sair</button>
        </header>

        <div style={{ margin: '20px 0', display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setMode('Entrada')} 
            style={{ flex: 1, padding: '15px', backgroundColor: mode === 'Entrada' ? '#28a745' : '#eee', color: mode === 'Entrada' ? 'white' : 'black' }}
          >Entrada</button>
          <button 
            onClick={() => setMode('Saída')} 
            style={{ flex: 1, padding: '15px', backgroundColor: mode === 'Saída' ? '#dc3545' : '#eee', color: mode === 'Saída' ? 'white' : 'black' }}
          >Saída</button>
        </div>

        <input 
          style={{ width: '100%', padding: '15px', fontSize: '1.2rem', marginBottom: '10px' }} 
          value={tagInput} 
          onChange={(e) => setTagInput(e.target.value)} 
          placeholder="Digite ou Leia a TAG" 
        />

        <button 
          style={{ width: '100%', padding: '15px', backgroundColor: '#000', color: '#fff', fontSize: '1.1rem' }} 
          onClick={validate}
        >Validar Acesso</button>

        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', textAlign: 'center', borderRadius: '8px' }}>
          <h3>{scanMsg}</h3>
        </div>
      </div>
    );
  }

  // --- INTERFACE ADMIN ---
  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', pb: '10px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Painel Administrativo</h2>
          <p style={{ margin: 0, color: '#666' }}>Olá, {operatorName}!</p>
        </div>
        <button onClick={signOut} style={{ padding: '8px 16px', cursor: 'pointer' }}>Sair</button>
      </header>

      {/* Seção de Cadastro Rápido / Busca */}
      <section style={{ margin: '20px 0', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
        <h3>Validar TAG Manualmente</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            style={{ flex: 1, padding: '10px' }}
            value={tagInput} 
            onChange={(e) => setTagInput(e.target.value)} 
            placeholder="Digite a TAG para testar" 
          />
          <button style={{ padding: '10px 20px' }} onClick={validate}>Verificar</button>
        </div>
        <p><strong>Resultado:</strong> {scanMsg}</p>
      </section>

      {/* Tabela de Usuários Cadastrados */}
      <section style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Veículos/Usuários Cadastrados</h3>
          <button onClick={loadVehicles} style={{ padding: '5px 10px', fontSize: '0.8rem' }}>Atualizar Lista</button>
        </div>
        
        <div style={{ overflowX: 'auto', marginTop: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#0070f3', color: 'white', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Nome</th>
                <th style={{ padding: '12px' }}>Placa</th>
                <th style={{ padding: '12px' }}>TAG</th>
                <th style={{ padding: '12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length > 0 ? (
                vehicles.map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{v.name}</td>
                    <td style={{ padding: '12px' }}><strong>{v.plate}</strong></td>
                    <td style={{ padding: '12px' }}><code style={{ background: '#eee', padding: '2px 5px' }}>{v.tag}</code></td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '12px', 
                        fontSize: '0.8rem',
                        backgroundColor: v.status === 'Ativo' ? '#e6fffa' : '#fff5f5',
                        color: v.status === 'Ativo' ? '#2c7a7b' : '#c53030',
                        border: `1px solid ${v.status === 'Ativo' ? '#b2f5ea' : '#feb2b2'}`
                      }}>
                        {v.status || 'Ativo'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ padding: '20px', textAlign: 'center' }}>Carregando ou nenhum veículo encontrado...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
