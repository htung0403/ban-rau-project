import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  description?: string;
  backPath?: string;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, backPath, actions }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-3">
        {backPath && (
          <button
            onClick={() => navigate(backPath)}
            className="p-2 rounded-xl border border-border bg-white text-muted-foreground hover:bg-muted transition-colors shrink-0"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-foreground leading-tight">{title}</h1>
          {description && (
            <p className="text-[13px] text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};

export default PageHeader;
