"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet, Send, Beaker, Copy, Check, Loader2 } from "lucide-react";
import { createWalletClient, custom, parseEther } from "viem";

interface DepositInfo {
  treasuryAddress: string | null;
  usdcAddress: string;
  chainId: number;
  chainIdHex: string;
  rpcUrl: string;
  explorer: string;
  network: string;
}

type Method = "wallet" | "manual" | "sandbox";
type Status = { kind: "idle" | "busy" | "ok" | "error"; msg?: string };

// Minimal EIP-1193 provider shape.
interface Eip1193 {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}
function injected(): Eip1193 | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: Eip1193 }).ethereum ?? null;
}

export function DepositPanel({ userId, onCredited }: { userId: string; onCredited?: (balance: number) => void }) {
  const [method, setMethod] = useState<Method>("wallet");
  const [info, setInfo] = useState<DepositInfo | null>(null);
  const [amount, setAmount] = useState("5");
  const [txHash, setTxHash] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/deposit/info")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => {});
  }, []);

  const amt = Number(amount) || 0;

  const verify = useCallback(
    async (hash: string, m: "wallet" | "manual") => {
      setStatus({ kind: "busy", msg: "Verifying on-chain…" });
      const res = await fetch("/api/deposit/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, txHash: hash, method: m }),
      });
      const d = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", msg: d.error ?? "Verification failed." });
        return;
      }
      setStatus({ kind: "ok", msg: d.message ?? "Deposit credited." });
      setTxHash("");
      if (typeof d.balance === "number") onCredited?.(d.balance);
    },
    [userId, onCredited],
  );

  async function payWithWallet() {
    if (!info?.treasuryAddress) {
      setStatus({ kind: "error", msg: "Deposits aren't configured (no treasury address)." });
      return;
    }
    const eth = injected();
    if (!eth) {
      setStatus({ kind: "error", msg: "No EVM wallet found. Install one, or use the manual method." });
      return;
    }
    if (amt <= 0) {
      setStatus({ kind: "error", msg: "Enter an amount." });
      return;
    }
    try {
      setStatus({ kind: "busy", msg: "Confirm the transfer in your wallet…" });
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const account = accounts?.[0] as `0x${string}` | undefined;
      if (!account) {
        setStatus({ kind: "error", msg: "No wallet account authorized." });
        return;
      }
      // Make sure the wallet is on Arc testnet.
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: info.chainIdHex }] });
      } catch (e) {
        if ((e as { code?: number }).code === 4902) {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: info.chainIdHex,
                chainName: info.network,
                // Arc's native gas token is USDC (18 decimals).
                nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
                rpcUrls: [info.rpcUrl],
                blockExplorerUrls: [info.explorer],
              },
            ],
          });
        } else {
          throw e;
        }
      }

      // Confirm the wallet is actually on Arc before spending (a silent failed
      // switch would otherwise submit on the wrong chain → "have 0").
      const currentChain = ((await eth.request({ method: "eth_chainId" })) as string) ?? "";
      if (currentChain.toLowerCase() !== info.chainIdHex.toLowerCase()) {
        setStatus({ kind: "error", msg: `Your wallet didn't switch to ${info.network}. Switch networks in your wallet and retry.` });
        return;
      }

      // Pre-check the *selected* account's native balance, so a wrong/empty
      // account surfaces clearly instead of a cryptic "insufficient funds".
      const value = parseEther(String(amt));
      const headroom = parseEther("0.5"); // gas (~0.26 USDC) + margin
      const balHex = ((await eth.request({ method: "eth_getBalance", params: [account, "latest"] })) as string) ?? "0x0";
      const balance = BigInt(balHex);
      if (balance < value + headroom) {
        const bal = Number(balance) / 1e18;
        const short = `${account.slice(0, 6)}…${account.slice(-4)}`;
        setStatus({
          kind: "error",
          msg: `Account ${short} holds ${bal.toFixed(3)} USDC on ${info.network} — not enough for $${amt.toFixed(2)} + gas. Fund this exact account at the faucet, or switch to your funded account in your wallet.`,
        });
        return;
      }

      const chain = {
        id: info.chainId,
        name: info.network,
        nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
        rpcUrls: { default: { http: [info.rpcUrl] } },
      } as const;
      const walletClient = createWalletClient({ account, chain, transport: custom(eth) });

      // Native USDC transfer (18 decimals) — this is the gas token and what the
      // faucet funds, so no separate token approval/balance is needed.
      const hash = await walletClient.sendTransaction({
        account,
        chain,
        to: info.treasuryAddress as `0x${string}`,
        value,
      });
      await verify(hash, "wallet");
    } catch (e) {
      const msg = (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? "Wallet transfer failed.";
      setStatus({ kind: "error", msg });
    }
  }

  async function sandboxTopup(value: number) {
    setStatus({ kind: "busy", msg: "Crediting…" });
    try {
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amountUsd: value }),
      });
      const d = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", msg: d.error ?? "Top-up failed." });
        return;
      }
      setStatus({ kind: "ok", msg: `Test-credited $${value.toFixed(2)}.` });
      if (typeof d.balance === "number") onCredited?.(d.balance);
    } catch {
      setStatus({ kind: "error", msg: "Top-up failed." });
    }
  }

  const busy = status.kind === "busy";

  return (
    <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <h2 className="font-display text-xl font-semibold">Add funds</h2>

      {/* Method tabs */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MethodTab icon={Wallet} label="Connect wallet" active={method === "wallet"} onClick={() => setMethod("wallet")} />
        <MethodTab icon={Send} label="Send manually" active={method === "manual"} onClick={() => setMethod("manual")} />
        <MethodTab icon={Beaker} label="Test credit" active={method === "sandbox"} onClick={() => setMethod("sandbox")} />
      </div>

      <div className="mt-5 space-y-4">
        {method === "wallet" && (
          <>
            <AmountField amount={amount} setAmount={setAmount} />
            <p className="text-xs text-[var(--color-muted)]">
              Connects your wallet on {info?.network ?? "Arc"} and sends ${amt.toFixed(2)} USDC to the treasury — you just
              confirm. We verify the transfer on-chain before crediting.
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              On Arc, USDC is also the gas token. Need test funds?{" "}
              <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="underline">
                Get testnet USDC →
              </a>
            </p>
            <button onClick={payWithWallet} disabled={busy || amt <= 0} className="btn-coin w-full disabled:opacity-50">
              {busy ? <Spinner /> : `Connect & deposit $${amt.toFixed(2)}`}
            </button>
          </>
        )}

        {method === "manual" && (
          <>
            {info?.treasuryAddress ? (
              <div className="space-y-1 border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                <p className="text-utility text-[var(--color-muted)]">Send native USDC on {info.network} to</p>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(info.treasuryAddress!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <code className="tabular break-all text-sm">{info.treasuryAddress}</code>
                  {copied ? <Check size={15} className="shrink-0 text-[var(--color-accent-2)]" /> : <Copy size={15} className="shrink-0 text-[var(--color-muted)]" />}
                </button>
              </div>
            ) : (
              <p className="text-sm text-red-400">No treasury address configured.</p>
            )}
            <div>
              <p className="text-utility mb-2 text-[var(--color-muted)]">Paste the transaction hash</p>
              <input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x…" className="charon-input w-full" />
            </div>
            <button
              onClick={() => verify(txHash.trim(), "manual")}
              disabled={busy || !/^0x[0-9a-fA-F]{64}$/.test(txHash.trim())}
              className="btn-coin w-full disabled:opacity-50"
            >
              {busy ? <Spinner /> : "Verify deposit"}
            </button>
          </>
        )}

        {method === "sandbox" && (
          <>
            <p className="text-xs text-[var(--color-muted)]">
              Instant test credit for the demo — no real funds move. Use Connect wallet or Send manually for real USDC.
            </p>
            <div className="flex flex-wrap gap-2">
              {[3, 5, 10].map((a) => (
                <button key={a} disabled={busy} onClick={() => sandboxTopup(a)} className="btn-outline">
                  + ${a}
                </button>
              ))}
            </div>
          </>
        )}

        {status.kind === "ok" && <p className="text-sm text-[var(--color-accent-2)]">{status.msg}</p>}
        {status.kind === "error" && <p className="text-sm text-red-400">{status.msg}</p>}
        {status.kind === "busy" && status.msg && <p className="text-sm text-[var(--color-muted)]">{status.msg}</p>}
      </div>
    </section>
  );
}

function MethodTab({ icon: Icon, label, active, onClick }: { icon: typeof Wallet; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 border p-3 text-center transition-colors ${
        active ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_8%,transparent)]" : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-muted)]"
      }`}
    >
      <Icon size={18} strokeWidth={1.5} className={active ? "text-[var(--color-gold)]" : undefined} />
      <span className="text-utility leading-tight">{label}</span>
    </button>
  );
}

function AmountField({ amount, setAmount }: { amount: string; setAmount: (v: string) => void }) {
  return (
    <div>
      <p className="text-utility mb-2 text-[var(--color-muted)]">Amount</p>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">$</span>
        <input type="number" min="0" step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} className="charon-input border w-full pl-7" />
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-flex items-center gap-2">
      <Loader2 size={15} className="animate-spin" /> Working…
    </span>
  );
}
