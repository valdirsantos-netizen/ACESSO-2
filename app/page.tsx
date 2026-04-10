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

  // 👇 COLOQUE SEU EMAIL AQUI
  const ADMIN_EMAILS = ['valdir.santos@mercadolivre.com'];

  const [userRole, setUserRole] = useState<'admin' | 'porteiro'>('porteiro');

  function resolveRole(email?: string | null) {
    const userEmail = (email || '').toLowerCase();
    return ADMIN_EMAILS.includes(userEmail) ? 'admin' : 'porteiro';
  }

  const [mode, setMode] = useState<Mode>('Entrada');
  const [tagInput, setTagInput] = useState('');
  const [plateInput, setPlateInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [search, setSearch] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [accesses, setAccesses] = useState<AccessRow[]>([]);
  const [allowed, setAllowed] = useState(0);
  const [blocked, setBlocked] = useState(0);
  const [connected, setConnected] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('Acesso liberado');
  const [dialogBody, setDialogBody] = useState('');
  const [dialogType, setDialogType] = useState<'Autorizado' | 'Bloqueado' | 'Não cadastrado'>('Autorizado');
  const [scanMsg, setScanMsg] = useState('Abra a câmera para ler um QR Code.');
  const [cameraHint, setCameraHint] = useState('Clique em “Iniciar câmera” para ler o QR Code.');
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [operatorName, setOperatorName] = useState('Operador');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('Sua Empresa');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanningRef = useRef(false);

  useEffect(() => {
    setCompanyName(process.env.NEXT_PUBLIC_COMPANY_NAME || 'Sua Empresa');
    const init = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setAuthReady(true);
        return;
      }
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      setSignedIn(Boolean(session));
      setAuthReady(true);
      setOperatorName(session?.user.email?.split('@')[0] || 'Operador');
      setUserRole(resolveRole(session?.user.email));
      if (session) {
        await Promise.all([loadVehicles(), loadAccesses()]);
      }
    };
    init();
  }, []);

  async function loadVehicles() {
    if (!supabase) return;
    const { data } = await supabase.from('vehicles').select('*');
    setVehicles((data as Vehicle[]) || []);
  }

  async function loadAccesses() {
    if (!supabase) return;
    const { data } = await supabase.from('access_logs').select('*');
    setAccesses((data as AccessRow[]) || []);
  }

  function normalize(value: string) {
    return String(value || '').trim().toUpperCase();
  }

  async function validate() {
    const tag = normalize(tagInput);
    if (!supabase) return;

    const { data } = await supabase.from('vehicles').select('*').eq('tag', tag).maybeSingle();

    if (!data) {
      setScanMsg('Tag não cadastrada');
      return;
    }

    if (data.status === 'Bloqueado') {
      setScanMsg('Acesso bloqueado');
      return;
    }

    setScanMsg('Acesso liberado');

    await supabase.from('access_logs').insert({
      tag,
      plate: data.plate,
      name: data.name,
      action: mode,
      result: 'Autorizado',
      operator_name: operatorName
    });
  }

  async function signIn() {
    if (!supabase) return;

    const { data } = await supabase.auth.signInWithPassword({ email, password });

    if (data.session) {
      setSignedIn(true);
      setOperatorName(data.session.user.email?.split('@')[0] || 'Operador');
      setUserRole(resolveRole(data.session.user.email));
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSignedIn(false);
  }

  // 🚨 PORTEIRO
  if (userRole === 'porteiro') {
    return (
      <div className="container">
        <h2>Painel da Portaria</h2>

        <button onClick={() => setMode('Entrada')}>Entrada</button>
        <button onClick={() => setMode('Saída')}>Saída</button>

        <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="TAG" />

        <button onClick={validate}>Validar</button>

        <p>{scanMsg}</p>

        <button onClick={signOut}>Sair</button>
      </div>
    );
  }

  // 🔥 ADMIN
  return (
    <div className="container">
      <h2>Painel Administrativo</h2>

      <button onClick={signOut}>Sair</button>

      <h3>Cadastro</h3>

      <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="TAG" />
      <input value={plateInput} onChange={(e) => setPlateInput(e.target.value)} placeholder="Placa" />
      <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Nome" />

      <button onClick={validate}>Testar acesso</button>
    </div>
  );
}
