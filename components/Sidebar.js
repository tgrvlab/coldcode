'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Home, Compass, Bell, User as UserIcon, Plus, Sun, Moon, Settings2, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

const Sidebar = ({ onPostClick, session, theme, toggleTheme }) => {
  const router = useRouter();

  return (
    <div className="fixed left-0 top-0 h-full w-[20%] border-r border-(--border) hidden lg:flex flex-col items-end px-8 py-12 overflow-y-auto scrollbar-hide z-40 bg-(--background)">
      <div className="flex flex-col gap-8 items-start w-[240px]">
        <h1 onClick={() => router.push('/')} className="text-3xl font-black text-(--foreground) tracking-tighter mb-4 flex items-center gap-2 cursor-pointer transition-transform active:scale-95">
          COLD<span className="text-(--accent)">CODE</span>
        </h1>
        <nav className="flex flex-col gap-6 w-full mt-2">
          <button onClick={() => router.push('/')} className="text-(--muted) font-medium text-xl flex items-center gap-4 hover:text-(--foreground) transition-colors pl-5 group">
            <Home size={22} className="group-hover:scale-110 transition-transform" />
            Home
          </button>
          {session?.user && (
            <>
              <button onClick={() => router.push('/profile')} className="text-(--muted) font-medium text-xl flex items-center gap-4 hover:text-(--foreground) transition-colors pl-5 group">
                <UserIcon size={22} className="group-hover:scale-110 transition-transform" />
                Profile
              </button>

              <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-red-500/80 font-medium text-xl flex items-center gap-4 hover:text-red-500 transition-colors pl-5 group mt-4">
                <LogOut size={22} className="group-hover:scale-110 transition-transform" />
                Logout
              </button>
            </>
          )}
        </nav>

        <div className="mt-8 flex flex-col gap-4 w-full">
          <button 
            onClick={() => onPostClick ? onPostClick() : router.push('/')}
            className="bg-(--accent) text-white font-bold py-4 px-12 rounded-full hover:opacity-90 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 text-lg"
          >
            <Plus size={20} strokeWidth={3} />
            POST
          </button>

          
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
