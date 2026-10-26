import('./supabase-cloud.js').catch(error=>{console.error('SARVIO Supabase initialization failed:',error);window.dispatchEvent(new CustomEvent('sarvio-cloud-error',{detail:error}));});
