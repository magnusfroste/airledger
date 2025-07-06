import { Button } from "@/components/ui/button";
import { Camera, MessageCircle, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const QuickActions = () => {
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Snabbåtgärder</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
          <Link to="/chat">
            <Camera className="h-6 w-6" />
            <span>Fotografera kvitto</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
          <Link to="/chat">
            <MessageCircle className="h-6 w-6" />
            <span>Fråga AI-assistenten</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
          <Link to="/transactions">
            <FileText className="h-6 w-6" />
            <span>Visa transaktioner</span>
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default QuickActions;