import React from 'react';
import { useAuth } from '../features/auth/AuthContext';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showLive?: boolean;
  children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, showLive, children }) => {
  const { user } = useAuth();
  const initials = user?.username?.substring(0, 2).toUpperCase() ?? 'AD';

  return (
    <div className="flex flex-col gap-5 mb-7 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-display text-[1.65rem] font-bold tracking-[-0.03em] text-foreground sm:text-[1.7rem]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-[13.5px] font-medium text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {children}
        {showLive && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-white/[0.02] px-3 py-2 text-[11px] font-semibold tracking-wide text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            LIVE
          </div>
        )}
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-400 font-display text-[13px] font-bold text-white">
          {initials}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
