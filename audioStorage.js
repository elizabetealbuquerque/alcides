import { supabase, modoDemo } from "./supabaseClient";

export async function salvarAudio(blob, caminho) {
  if (modoDemo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(leitor.result);
      leitor.onerror = reject;
      leitor.readAsDataURL(blob);
    });
  }

  const { error } = await supabase.storage.from("audios").upload(caminho, blob);
  if (error) throw error;

  const { data } = supabase.storage.from("audios").getPublicUrl(caminho);
  return data.publicUrl;
}

export async function excluirArquivoAudio(caminho) {
  if (modoDemo) return;
  await supabase.storage.from("audios").remove([caminho]);
}
