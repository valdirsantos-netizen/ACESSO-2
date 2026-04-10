async function loadVehicles() {
    if (!supabase) return;
    
    // Select simples sem ordenação para evitar o erro 400
    const { data, error } = await supabase
      .from('vehicles')
      .select('*');

    if (error) {
      console.error("Erro na tabela vehicles:", error.message);
      return;
    }

    console.log("Veículos carregados:", data);
    setVehicles(data || []);
  }

  async function loadAccesses() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from('access_logs')
      .select('*');

    if (error) {
      console.error("Erro na tabela access_logs:", error.message);
      return;
    }

    setAccesses(data || []);
  }
