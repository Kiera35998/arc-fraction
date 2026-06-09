"use client";
import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { ConnectButton } from "./ConnectButton";

const ADDR = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0") as `0x${string}`;
const ABI = [
  { name: "create", type: "function", stateMutability: "nonpayable", inputs: [{ name: "asset", type: "string" }, { name: "desc", type: "string" }, { name: "totalShares", type: "uint256" }, { name: "sharePrice", type: "uint256" }], outputs: [] },
  { name: "buy", type: "function", stateMutability: "payable", inputs: [{ name: "id", type: "uint256" }, { name: "amount", type: "uint256" }], outputs: [] },
  { name: "getVault", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "tuple", components: [{ name: "curator", type: "address" }, { name: "asset", type: "string" }, { name: "description", type: "string" }, { name: "totalShares", type: "uint256" }, { name: "sharePrice", type: "uint256" }, { name: "soldShares", type: "uint256" }, { name: "raised", type: "uint256" }, { name: "active", type: "bool" }, { name: "createdAt", type: "uint256" }] }] },
  { name: "sharesOf", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }, { name: "u", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "totalVaults", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
const fmt = (a: string) => `${a.slice(0,6)}...${a.slice(-4)}`;

export default function App() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<"view"|"create">("view");
  const [viewId, setViewId] = useState("0");
  const [buyAmt, setBuyAmt] = useState("10");
  const [form, setForm] = useState({ asset: "", desc: "", shares: "1000", price: "1" });
  const { data: total, refetch: rTotal } = useReadContract({ address: ADDR, abi: ABI, functionName: "totalVaults" });
  const { data: v, refetch: rV } = useReadContract({ address: ADDR, abi: ABI, functionName: "getVault", args: [BigInt(viewId||"0")] });
  const { data: myShares, refetch: rS } = useReadContract({ address: ADDR, abi: ABI, functionName: "sharesOf", args: v && address ? [BigInt(viewId), address] : undefined, query: { enabled: !!v && !!address } });
  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash, query: { enabled: !!txHash } });
  useEffect(() => { if(!isSuccess) return; rTotal(); rV(); rS(); reset(); setForm({asset:"",desc:"",shares:"1000",price:"1"}); setTab("view"); }, [isSuccess]); // eslint-disable-line
  const busy = isPending || isConfirming;
  const pct = v && v.totalShares > 0n ? Math.round(Number(v.soldShares*100n/v.totalShares)) : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3"><span className="text-2xl">🧩</span><span className="font-bold text-lg">Arc Fraction</span><span className="text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full">{total?.toString() ?? "0"} vaults</span></div>
        <ConnectButton />
      </header>
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="text-center"><h1 className="text-4xl font-extrabold bg-gradient-to-br from-cyan-400 to-blue-500 bg-clip-text text-transparent">Fractionalize 🧩</h1><p className="text-gray-400 text-sm mt-1">Own a piece of an asset</p></div>
        {busy && <div className="text-center text-sm text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-xl py-3 animate-pulse">{isPending ? "Confirm in wallet..." : "Processing..."}</div>}
        <div className="flex gap-2">{(["view","create"] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${tab===t?"bg-cyan-500 text-black":"bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{t==="create"?"Fractionalize":"Buy Shares"}</button>)}</div>
        {tab === "create" && <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div className="space-y-1"><label className="text-xs text-gray-500 uppercase tracking-wider">Asset</label><input value={form.asset} onChange={e=>setForm(f=>({...f,asset:e.target.value}))} placeholder="Rare painting" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500" /></div>
          <div className="space-y-1"><label className="text-xs text-gray-500 uppercase tracking-wider">Description</label><input value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500" /></div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><label className="text-xs text-gray-500 uppercase tracking-wider">Total Shares</label><input value={form.shares} onChange={e=>setForm(f=>({...f,shares:e.target.value}))} type="number" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div><div className="space-y-1"><label className="text-xs text-gray-500 uppercase tracking-wider">Price/Share (USDC)</label><input value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} type="number" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div></div>
          <button onClick={()=>writeContract({address:ADDR,abi:ABI,functionName:"create",args:[form.asset,form.desc,BigInt(form.shares||"1"),parseEther(form.price||"0")]})} disabled={!isConnected||busy||!form.asset} className="w-full py-3 font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-black hover:opacity-90 disabled:opacity-40">{busy?"...":"Fractionalize 🧩"}</button>
        </div>}
        {tab === "view" && <div className="space-y-4">
          <input value={viewId} onChange={e=>setViewId(e.target.value)} placeholder="Vault ID" type="number" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500" />
          {v && <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-start"><div><h3 className="font-bold text-lg">{v.asset}</h3><p className="text-xs text-gray-500">by {fmt(v.curator)}</p></div><span className="text-cyan-400 font-bold">{formatEther(v.sharePrice)} / share</span></div>
            <p className="text-sm text-gray-400">{v.description}</p>
            <div className="space-y-1"><div className="flex justify-between text-sm text-gray-400"><span>{v.soldShares.toString()} / {v.totalShares.toString()} sold</span><span>{pct}%</span></div><div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all" style={{width:`${pct}%`}} /></div></div>
            {myShares !== undefined && myShares > 0n && <div className="text-center text-sm text-cyan-400">You own {myShares.toString()} shares</div>}
            <div className="flex gap-2"><input value={buyAmt} onChange={e=>setBuyAmt(e.target.value)} type="number" className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none" /><button onClick={()=>writeContract({address:ADDR,abi:ABI,functionName:"buy",args:[BigInt(viewId),BigInt(buyAmt||"0")],value:v.sharePrice*BigInt(buyAmt||"0")})} disabled={!isConnected||busy} className="px-4 py-2 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 disabled:opacity-40 text-sm">{busy?"...":`Buy (${formatEther(v.sharePrice*BigInt(buyAmt||"0"))} USDC)`}</button></div>
          </div>}
        </div>}
      </main>
      <footer className="border-t border-gray-800 py-4 text-center text-gray-600 text-xs">Built on <a href="https://arc.network" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Arc Network</a></footer>
    </div>
  );
}
