async function loadVehicles() {
  if (!supabase) return;
  
  // O .select('*', { count: 'exact' }) ajuda a debugar se há dados
  const { data, error, count } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact' });

  if (error) {
    console.error("Erro Supabase:", error.message);
    return;
  }

  console.log("Veículos carregados:", data.length); // Verifique isso no F12
  setVehicles(data || []);
}
