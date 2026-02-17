
import DemoControlPanel from './DemoControlPanel';
import DemoMessageList from './DemoMessageList';
import { useDemoRunner } from '@/hooks/useDemoRunner';

const DemoRunner = () => {
  const demo = useDemoRunner();

  return (
    <div className="h-[calc(100vh-3rem-4rem)] bg-background flex flex-col">
      <div className="shrink-0">
        <DemoControlPanel
          state={demo.state}
          speed={demo.speed}
          currentIndex={demo.currentIndex}
          total={demo.total}
          currentQuarter={demo.currentQuarter}
          isWaitingForAI={demo.isWaitingForAI}
          onPlay={() => demo.play(0)}
          onPause={demo.pause}
          onResume={demo.resume}
          onStop={demo.stop}
          onNextStep={demo.nextStep}
          onSpeedChange={demo.setSpeed}
          onJumpToQuarter={demo.jumpToQuarter}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        <DemoMessageList
          messages={demo.messages}
          isWaitingForAI={demo.isWaitingForAI}
        />
      </div>
    </div>
  );
};

export default DemoRunner;
