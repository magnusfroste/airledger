
import { Play, Pause, Square, SkipForward, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { QUARTER_SUMMARIES, TESTBOLAGET_INFO } from '@/data/testbolaget-scenarios';
import { type DemoSpeed, type DemoState } from '@/hooks/useDemoRunner';

interface DemoControlPanelProps {
  state: DemoState;
  speed: DemoSpeed;
  currentIndex: number;
  total: number;
  currentQuarter: string;
  isWaitingForAI: boolean;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onNextStep: () => void;
  onSpeedChange: (speed: DemoSpeed) => void;
  onJumpToQuarter: (quarter: string) => void;
}

const DemoControlPanel = ({
  state,
  speed,
  currentIndex,
  total,
  currentQuarter,
  isWaitingForAI,
  onPlay,
  onPause,
  onResume,
  onStop,
  onNextStep,
  onSpeedChange,
  onJumpToQuarter,
}: DemoControlPanelProps) => {
  const progress = total > 0 ? (currentIndex / total) * 100 : 0;
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4', 'edge'];

  return (
    <div className="bg-surface border-b border-border/30 px-4 py-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-foreground">🏢 {TESTBOLAGET_INFO.name}</span>
          <Badge variant="secondary" className="text-xs">{TESTBOLAGET_INFO.industry}</Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {currentIndex} / {total}
        </span>
      </div>

      {/* Progress */}
      <Progress value={progress} className="h-1.5" />

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        {/* Play/Pause/Stop */}
        <div className="flex items-center gap-1">
          {state === 'idle' || state === 'done' ? (
            <Button size="sm" onClick={onPlay} className="gap-1.5">
              <Play className="h-3.5 w-3.5" />
              {state === 'done' ? 'Kör igen' : 'Starta demo'}
            </Button>
          ) : state === 'playing' ? (
            <Button size="sm" variant="outline" onClick={onPause} className="gap-1.5">
              <Pause className="h-3.5 w-3.5" />
              Paus
            </Button>
          ) : (
            <Button size="sm" onClick={onResume} className="gap-1.5">
              <Play className="h-3.5 w-3.5" />
              Fortsätt
            </Button>
          )}

          {state !== 'idle' && (
            <Button size="sm" variant="ghost" onClick={onStop}>
              <Square className="h-3.5 w-3.5" />
            </Button>
          )}

          {speed === 'step' && state === 'paused' && (
            <Button size="sm" variant="outline" onClick={onNextStep} className="gap-1">
              <SkipForward className="h-3.5 w-3.5" />
              Nästa
            </Button>
          )}
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-1">
          {(['fast', 'normal', 'step'] as DemoSpeed[]).map(s => (
            <Button
              key={s}
              size="sm"
              variant={speed === s ? 'default' : 'ghost'}
              className="h-7 px-2 text-xs"
              onClick={() => onSpeedChange(s)}
            >
              {s === 'fast' ? '2s' : s === 'normal' ? '4s' : 'Steg'}
            </Button>
          ))}
        </div>
      </div>

      {/* Quarter jump */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {quarters.map(q => {
          const qi = QUARTER_SUMMARIES.find(qs => qs.quarter === q);
          return (
            <Button
              key={q}
              size="sm"
              variant={currentQuarter === q ? 'secondary' : 'ghost'}
              className="h-6 px-2 text-xs whitespace-nowrap"
              onClick={() => onJumpToQuarter(q)}
              disabled={state === 'idle'}
            >
              <ChevronRight className="h-3 w-3 mr-0.5" />
              {qi?.label || q}
            </Button>
          );
        })}
      </div>

      {/* AI indicator */}
      {isWaitingForAI && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          Air tänker...
        </div>
      )}
    </div>
  );
};

export default DemoControlPanel;
