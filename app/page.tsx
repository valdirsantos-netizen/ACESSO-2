'use client';

import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

type Vehicle = {
  id: string;
  tag: string;
  plate: string;
  name: string;
  status: string;
};

type AccessRow = {
  id: string;
  created_at: string;
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
  const ADMIN_EMAILS = ['valdir.santos@mercadolivre.com'];

  const [userRole, setUserRole] = useState<'admin' | 'porteiro'>('porteiro');
  const [mode, setMode] = useState<Mode>('Entrada');
  const [tagInput, setTagInput] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [accesses, setAccesses] = useState<AccessRow[]>([]);
  const [scanMsg, setScanMsg] = useState('Aguardando leitura...');
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [operatorName, setOperatorName] = useState('Operador');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function resolveRole(email?: string | null) {
    const userEmail = (email || '').toLowerCase();
    return ADMIN_EMAILS.includes(userEmail) ? 'admin' : 'porteiro';
  }

  useEffect(() => {
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
        setUserRole(resolveRole(session.user.email));
        
        // Chamada imediata das funções de carga
        await Promise.all([loadVehicles(), loadAccesses()]);
      }
      setAuthReady(true);
    };
    init();
  }, []);

  async function loadVehicles() {
    if (!supabase) return;
    const { data, error } = await supabase.from('vehicles').select('*').order('name');
    if (error) console.error("Erro ao buscar veículos:", error);
    setVehicles((data as Vehicle[]) || []);
  }

  async function loadAccesses() {
    if (!supabase) return;
    const { data } = await supabase.from('access_logs').select('*').order('created_at', { ascending: false }).limit(50);
    setAccesses((data as AccessRow[]) || []);
  }

  async function validate() {
    if (!supabase) return;
    const tag = tagInput.trim().toUpperCase();
    const { data } = await supabase.from('vehicles').select('*').eq('tag', tag).maybeSingle();

    if (!data) {
      setScanMsg('❌ TAG NÃO ENCONTRADA');
      return;
    }

    if (data.status === 'Bloqueado') {
      setScanMsg('🚫 ACESSO BLOQUEADO');
      return;
    }

    setScanMsg(`✅ LIBERADO: ${data.name}`);

    await supabase.from('access_logs').insert({
      tag: data.tag,
      plate: data.plate,
      name: data.name,
      action: mode,
      result: 'Autorizado',
      operator_name: operatorName
    });
    
    await loadAccesses();
    setTagInput('');
  }

  async function signIn() {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Erro: ' + error.message);
    else window.location.reload();
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.reload();
  }

  if (!authReady) return <div style={{ padding: '20px' }}>Iniciando...</div>;

  if (!signedIn) {
    return (
      <div style={{ padding: '50px', maxWidth: '400px', margin: 'auto', textAlign: 'center' }}>
        <h2>Login Estacionamento</h2>
        <input style={{ width: '100%', padding: '10px', marginBottom: '10px' }} placeholder="Email" onChange={e => setEmail(e.target.value)} />
        <input style={{ width: '100%', padding: '10px', marginBottom: '10px' }} type="password" placeholder="Senha" onChange={e => setPassword(e.target.value)} />
        <button style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: '#fff', border: 'none' }} onClick={signIn}>Entrar</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
        <h3>Controle de Acesso - {userRole.toUpperCase()}</h3>
        <button onClick={signOut}>Sair ({operatorName})</button>
      </header>

      {/* CARD DE RESUMO (O que estava faltando na sua imagem) */}
      {userRole === 'admin' && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ 
            backgroundColor: '#1a2233', 
            color: 'white', 
            padding: '20px', 
            borderRadius: '15px', 
            width: '200px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
          }}>
            <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>Veículos cadastrados</p>
            <h1 style={{ margin: '10px 0 0 0', fontSize: '2.5rem' }}>{vehicles.length}</h1>
          </div>
        </div>
      )}

      {/* ÁREA DE VALIDAÇÃO */}
      <section style={{ margin: '20px 0', padding: '20px', backgroundColor: '#f4f4f4', borderRadius: '8px' }}>
        <h4>Validar Acesso</h4>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button onClick={() => setMode('Entrada')} style={{ flex: 1, padding: '10px', backgroundColor: mode === 'Entrada' ? '#28a745' : '#ccc', color: '#fff' }}>Entrada</button>
          <button onClick={() => setMode('Saída')} style={{ flex: 1, padding: '10px', backgroundColor: mode === 'Saída' ? '#dc3545' : '#ccc', color: '#fff' }}>Saída</button>
        </div>
        <input 
          style={{ width: '100%', padding: '15px', fontSize: '1.2rem', marginBottom: '10px' }} 
          value={tagInput} 
          onChange={(e) => setTagInput(e.target.value)} 
          placeholder="Digite ou bipe a TAG"
          onKeyDown={(e) => e.key === 'Enter' && validate()}
        />
        <div style={{ textAlign: 'center', fontWeight: 'bold', color: scanMsg.includes('✅') ? 'green' : 'red' }}>{scanMsg}</div>
      </section>

      {/* TABELAS PARA ADMIN */}
      {userRole === 'admin' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <section>
            <h4>📋 Veículos</h4>
            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #eee' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#eee' }}>
                  <tr>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Nome</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Placa</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map(v => (
                    <tr key={v.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{v.name}</td>
                      <td style={{ padding: '8px' }}>{v.plate}</td>
                      <td style={{ padding: '8px', color: v.status === 'Liberado' ? 'green' : 'red' }}>{v.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h4>🕒 Histórico</h4>
            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #eee' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#eee' }}>
                  <tr>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Hora</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Veículo</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {accesses.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                      <td style={{ padding: '8px' }}>{log.name}</td>
                      <td style={{ padding: '8px' }}>{log.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
