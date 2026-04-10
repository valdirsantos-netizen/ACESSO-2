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
