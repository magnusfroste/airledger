import { ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

const PageLayout = ({ children, className = "" }: PageLayoutProps) => {
  return (
    <div className={`container px-3 py-3 pb-20 sm:px-6 sm:py-6 sm:pb-6 max-w-6xl mx-auto ${className}`}>
      {children}
    </div>
  );
};

export default PageLayout;