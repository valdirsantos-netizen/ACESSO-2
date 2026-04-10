'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
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
  tag: string;
  plate: string;
  name: string;
  action: string;
  result: string;
};

type Mode = 'Entrada' | 'Saída';

export default function Page() {

  // 🔐 DEFINA SEU EMAIL AQUI
  const ADMIN_EMAILS = ['valdir.santos@mercadolivre.com'];

  const [userRole, setUserRole] = useState<'admin' | 'porteiro'>('porteiro');

  function resolveRole(email?: string | null) {
    return ADMIN_EMAILS.includes((email || '').toLowerCase()) ? 'admin' : 'porteiro';
  }

  const [mode, setMode] = useState<Mode>('Entrada');
  const [tagInput, setTagInput] = useState('');
  const [plateInput, setPlateInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [accesses, setAccesses] = useState<AccessRow[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [operatorName, setOperatorName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [scanMsg, setScanMsg] = useState('');

  // 🔄 LOGIN / INIT
  useEffect(() => {
    const init = async () => {
      if (!supabase) return;

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (session) {
        setSignedIn(true);
        setOperatorName(session.user.email || '');
        setUserRole(resolveRole(session.user.email));

        loadVehicles();
        loadAccesses();
      }
    };

    init();
  }, []);

  // 📥 CARREGAR DADOS
  async function loadVehicles() {
    const { data } = await supabase.from('vehicles').select('*');
    setVehicles(data || []);
  }

  async function loadAccesses() {
    const { data } = await supabase.from('access_logs').select('*');
    setAccesses(data || []);
  }

  function normalize(v: string) {
    return v.trim().toUpperCase();
  }

  // 🚪 VALIDAR ACESSO
  async function validate() {
    const tag = normalize(tagInput);

    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('tag', tag)
      .maybeSingle();

    if (!data) {
      setScanMsg('❌ Não cadastrado');
      return;
    }

    if (data.status === 'Bloqueado') {
      setScanMsg('⛔ Bloqueado');
      return;
    }

    setScanMsg('✅ Liberado');

    await supabase.from('access_logs').insert({
      tag,
      plate: data.plate,
      name: data.name,
      action: mode,
      result: 'Autorizado'
    });
  }

  // ➕ CADASTRAR
  async function saveVehicle() {
    await supabase.from('vehicles').insert({
      tag: normalize(tagInput),
      plate: plateInput,
      name: nameInput,
      status: 'Liberado'
    });

    setTagInput('');
    setPlateInput('');
    setNameInput('');

    loadVehicles();
  }

  // 🔐 LOGIN
  async function signIn() {
    const { data } = await supabase.auth.signInWithPassword({ email, password });

    if (data.session) {
      setSignedIn(true);
      setUserRole(resolveRole(data.session.user.email));
      loadVehicles();
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSignedIn(false);
  }

  // 🔒 LOGIN SCREEN
  if (!signedIn) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Login</h2>
        <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Senha" onChange={(e) => setPassword(e.target.value)} />
        <button onClick={signIn}>Entrar</button>
      </div>
    );
  }

  // 👮‍♂️ PORTEIRO
  if (userRole === 'porteiro') {
    return (
      <div style={{ padding: 20 }}>
        <h2>Painel Portaria</h2>

        <button onClick={() => setMode('Entrada')}>Entrada</button>
        <button onClick={() => setMode('Saída')}>Saída</button>

        <input
          placeholder="TAG"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
        />

        <button onClick={validate}>Validar</button>

        <p>{scanMsg}</p>

        <button onClick={signOut}>Sair</button>
      </div>
    );
  }

  // 🧑‍💼 ADMIN
  return (
    <div style={{ padding: 20 }}>
      <h2>Painel Administrativo</h2>

      <button onClick={signOut}>Sair</button>

      <h3>Total cadastrados: {vehicles.length}</h3>

      <h3>Cadastro</h3>

      <input placeholder="TAG" value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
      <input placeholder="Placa" value={plateInput} onChange={(e) => setPlateInput(e.target.value)} />
      <input placeholder="Nome" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />

      <button onClick={saveVehicle}>Cadastrar</button>

      <h3>Lista de cadastrados</h3>

      {vehicles.map((v) => (
        <div key={v.id} style={{ border: '1px solid #ccc', padding: 10, marginTop: 5 }}>
          {v.name} - {v.plate} - {v.tag}
        </div>
      ))}
    </div>
  );
}
