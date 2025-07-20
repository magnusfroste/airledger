
import { ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

const PageLayout = ({ children, className = "" }: PageLayoutProps) => {
  return (
    <div className={`container px-6 py-6 max-w-6xl mx-auto ${className}`}>
      {children}
    </div>
  );
};

export default PageLayout;
