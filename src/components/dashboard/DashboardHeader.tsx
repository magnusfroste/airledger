import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardHeaderProps {
  greeting: string;
  userName: string;
}

const DashboardHeader = ({ greeting, userName }: DashboardHeaderProps) => {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {greeting}, {userName}! 👋
            </h1>
            <p className="text-gray-600 mt-1">Din översikt</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button asChild>
              <Link to="/chat">
                <Bot className="h-4 w-4 mr-2" />
                Jag är Air, din assistent!
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;