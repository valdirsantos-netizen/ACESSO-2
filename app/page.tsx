async function loadVehicles() {
  try {
    if (!supabase) {
      console.error("Supabase não configurado no loadVehicles");
      return;
    }

    // Buscamos os dados
    const { data, error, count } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact' });

    if (error) {
      console.error("Erro na busca do Supabase:", error.message);
      return;
    }

    console.log("Dados recebidos do banco:", data);
    console.log("Contagem exata:", count);

    // Forçamos a atualização do estado
    if (data) {
      setVehicles([...data]); 
    }
  } catch (err) {
    console.error("Erro inesperado:", err);
  }
}
