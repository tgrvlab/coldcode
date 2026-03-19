'use client';

import { signIn } from "next-auth/react";
import { Terminal } from "lucide-react";
import { RiGithubLine } from "react-icons/ri";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-(--background) flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm border border-(--border)/50 bg-(--card)/50 backdrop-blur-3xl rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-(--accent) to-purple-600" />
        <div className="w-16 h-16 rounded-2xl bg-black border border-white/5 flex items-center justify-center mb-6 shadow-2xl shadow-black">
          <Terminal size={32} className="text-(--accent)" />
        </div>
        <h1 className="text-2xl font-black text-(--foreground) tracking-tighter mb-2">Connect to Cold Code</h1>
        <p className="text-(--muted) text-sm mb-10 leading-relaxed font-medium">Authenticate securely with GitHub to start remixing the world's code.</p>
        
        <button 
          onClick={() => signIn('github', { callbackUrl: '/' })}
          className="w-full bg-white text-black font-black flex items-center justify-center gap-3 py-4 rounded-xl hover:scale-[1.02] transition-all shadow-lg active:scale-95 text-sm uppercase tracking-[0.2em]"
        >
          <RiGithubLine size={20} />
          Sign in with GitHub
        </button>
      </div>
      
      <p className="text-(--muted) text-[10px] font-bold uppercase tracking-[0.2em] mt-10 text-center max-w-xs opacity-40">
        By connecting, you agree to our Terms of Service and Developer Ethics.
      </p>
    </div>
  );
}
