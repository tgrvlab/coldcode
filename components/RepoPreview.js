'use client';

import React, { useState, useEffect } from 'react';
import { GitFork, Star, Users } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';

const RepoPreview = ({ url }) => {
  const [repoData, setRepoData] = useState(null);
  const [contributors, setContributors] = useState([]);

  useEffect(() => {
    if (!url) return;
    const repoPath = url.split('github.com/').pop();
    
    const fetchData = async () => {
      try {
        const repoRes = await fetch(`https://api.github.com/repos/${repoPath}`);
        const repoJson = await repoRes.json();
        if (repoJson.name) {
          setRepoData(repoJson);
          
          // Fetch top contributors
          const contribRes = await fetch(`https://api.github.com/repos/${repoPath}/contributors?per_page=5`);
          const contribJson = await contribRes.json();
          if (Array.isArray(contribJson)) {
            setContributors(contribJson);
          }
        }
      } catch (err) {
        console.error("Failed to fetch GitHub data:", err);
      }
    };
    
    fetchData();
  }, [url]);

  if (!url || !repoData) return null;

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block w-full h-[20vh] bg-(--background) border-t border-(--border)/10 transition-all group/repo select-none relative overflow-hidden hover:bg-(--card-hover) repo-preview-container"
    >
      <div className="h-full w-full p-5 flex flex-col justify-between relative z-10">
        {/* Top Row: Repo Name & Description */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <FaGithub className="text-(--foreground) group-hover/repo:scale-110 transition-transform" size={18} />
            <span className="text-sm font-bold text-[#58a6ff] hover:underline decoration-thickness-2 tracking-tight">
              {repoData.full_name}
            </span>
            {repoData.language && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-(--foreground)/5 border border-(--border)">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f1e05a]" /> {/* Github style lang dot */}
                <span className="text-[10px] text-(--muted) font-medium">{repoData.language}</span>
              </div>
            )}
          </div>
          <p className="text-[12px] text-(--foreground)/60 line-clamp-2 leading-relaxed max-w-2xl">
            {repoData.description || "No description provided for this repository."}
          </p>
        </div>

        {/* Bottom Row: Stats & Contributors */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 text-(--muted) group-hover/repo:text-[#e3b341] transition-colors">
              <Star size={14} className="fill-current" />
              <span className="text-[12px] font-bold">{repoData.stargazers_count?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-(--muted) group-hover/repo:text-(--foreground) transition-colors">
              <GitFork size={14} />
              <span className="text-[12px] font-bold">{repoData.forks_count?.toLocaleString() || '0'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {contributors.length > 0 && (
              <div className="flex -space-x-2 items-center">
                {contributors.map((c) => (
                  <div key={c.id} className="w-6 h-6 rounded-full border-2 border-(--background) overflow-hidden transition-transform group-hover/repo:translate-x-1 hover:z-20">
                    <img src={c.avatar_url} alt={c.login} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subtle Decorative Background Icon */}
      <FaGithub className="absolute -bottom-8 -right-8 text-(--foreground)/3 rotate-12 transition-all group-hover/repo:scale-125 group-hover/repo:text-(--foreground)/8" size={150} />
    </a>
  );
};

export default RepoPreview;
