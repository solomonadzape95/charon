/** Client helper: upload an image to the `covers` bucket, return its public URL. */
export async function uploadImage(file: File, folder = "uploads"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/upload?folder=${encodeURIComponent(folder)}`, { method: "POST", body: fd });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error ?? "upload failed");
  return d.url as string;
}
