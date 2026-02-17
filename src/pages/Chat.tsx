import { useSearchParams } from "react-router-dom";
import ChatInterface from "@/components/ChatInterface";
import DemoRunner from "@/components/demo/DemoRunner";

const Chat = () => {
  const [searchParams] = useSearchParams();
  const demoMode = searchParams.get('demo');

  if (demoMode === 'testbolaget') {
    return <DemoRunner />;
  }

  return <ChatInterface />;
};

export default Chat;
