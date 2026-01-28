import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function VaultPage({
  onNavigate,
}: {
  onNavigate: (view: string) => void;
}) {
  const [status, setStatus] = useState("Idle");
  const [result, setResult] = useState<any>(null);

  const testCrypto = async () => {
    try {
      setStatus("Running...");
      setResult(null);

      const keyB64 = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";

      await invoke("unlock_vault", { keyB64 });

      const blob = await invoke<string>("encrypt_entry", {
        entry: {
          folder_name: "Work",
          website_url: "https://github.com",
          tags: ["dev", "git"],
          password: "S3CR3T",
        },
      });

      const decrypted = await invoke("decrypt_entry", { blobB64: blob });

      setResult(decrypted);

      await invoke("lock_vault");
      setStatus("Done ✅");
    } catch (err) {
      console.error(err);
      setStatus("Error ❌ " + String(err));
    }
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold">Vault</h1>

      <p className="mt-2">Status: {status}</p>

      <div className="mt-4 flex gap-3">
        <button className="px-4 py-2 rounded bg-blue-600" onClick={testCrypto}>
          Test Crypto
        </button>
        <button
          className="px-4 py-2 rounded bg-slate-700"
          onClick={() => onNavigate("home")}
        >
          Back
        </button>
      </div>

      {result && (
        <pre className="mt-6 p-4 rounded bg-black/40 text-sm overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
