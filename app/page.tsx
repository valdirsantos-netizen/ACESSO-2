async function loadVehicles() {
  if (!supabase) return;

  // Mudamos o .order('created_at') para .order('name')
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error("Erro ao buscar veículos:", error.message);
    return;
  }

  console.log("Veículos carregados com sucesso:", data);
  setVehicles(data || []);
}

async function loadAccesses() {
    if (!supabase) return;
    
    const { data, error } = await supabase
      .from('access_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error("Erro ao buscar logs:", error.message);
      return;
    }

    setAccesses(data || []);
  }
