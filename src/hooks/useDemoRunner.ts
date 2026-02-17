
import { useState, useRef, useCallback } from 'react';
import { TESTBOLAGET_SCENARIOS, QUARTER_SUMMARIES, type DemoScenario } from '@/data/testbolaget-scenarios';
import { supabase } from '@/integrations/supabase/client';

export type DemoSpeed = 'fast' | 'normal' | 'step';
export type DemoState = 'idle' | 'playing' | 'paused' | 'done';

const SPEED_MS: Record<DemoSpeed, number> = {
  fast: 2000,
  normal: 4000,
  step: 0, // manual
};

interface DemoMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: Date;
  type: 'text' | 'demo-label';
  scenarioId?: string;
}

export function useDemoRunner() {
  const [state, setState] = useState<DemoState>('idle');
  const [speed, setSpeed] = useState<DemoSpeed>('normal');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [isWaitingForAI, setIsWaitingForAI] = useState(false);
  const abortRef = useRef(false);
  const pauseRef = useRef(false);

  const scenarios = TESTBOLAGET_SCENARIOS;
  const total = scenarios.length;
  const current = scenarios[currentIndex] || null;

  const currentQuarter = current?.quarter || '';
  const quarterInfo = QUARTER_SUMMARIES.find(q => q.quarter === currentQuarter);

  const addMessage = useCallback((msg: DemoMessage) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  const sleep = (ms: number) => new Promise<void>(resolve => {
    const timer = setTimeout(resolve, ms);
    // Allow abort to break sleep
    const check = setInterval(() => {
      if (abortRef.current) {
        clearTimeout(timer);
        clearInterval(check);
        resolve();
      }
    }, 100);
  });

  const waitForUnpause = () => new Promise<void>(resolve => {
    const check = setInterval(() => {
      if (!pauseRef.current || abortRef.current) {
        clearInterval(check);
        resolve();
      }
    }, 200);
  });

  const runScenario = useCallback(async (scenario: DemoScenario, index: number) => {
    if (abortRef.current) return;

    // Check if new quarter — show quarter label
    const prev = index > 0 ? scenarios[index - 1] : null;
    if (!prev || prev.quarter !== scenario.quarter) {
      const qi = QUARTER_SUMMARIES.find(q => q.quarter === scenario.quarter);
      addMessage({
        id: `quarter-${scenario.quarter}`,
        content: `📅 **${qi?.label || scenario.quarter}** — ${qi?.description || ''}`,
        sender: 'system',
        timestamp: new Date(),
        type: 'demo-label',
      });
    }

    // Show scenario label
    addMessage({
      id: `label-${scenario.id}`,
      content: `💼 ${scenario.description}`,
      sender: 'system',
      timestamp: new Date(),
      type: 'demo-label',
      scenarioId: scenario.id,
    });

    // "Type" user message
    addMessage({
      id: `user-${scenario.id}`,
      content: scenario.message,
      sender: 'user',
      timestamp: new Date(),
      type: 'text',
      scenarioId: scenario.id,
    });

    // Call edge function
    setIsWaitingForAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: { message: scenario.message, conversationHistory: [] },
      });

      if (error) throw error;

      addMessage({
        id: `ai-${scenario.id}`,
        content: data?.response || '⚠️ Inget svar',
        sender: 'ai',
        timestamp: new Date(),
        type: 'text',
        scenarioId: scenario.id,
      });
    } catch (err: any) {
      addMessage({
        id: `err-${scenario.id}`,
        content: `❌ Fel: ${err.message}`,
        sender: 'ai',
        timestamp: new Date(),
        type: 'text',
        scenarioId: scenario.id,
      });
    } finally {
      setIsWaitingForAI(false);
    }
  }, [scenarios, addMessage]);

  const play = useCallback(async (fromIndex = 0) => {
    abortRef.current = false;
    pauseRef.current = false;
    setState('playing');

    // Intro message
    if (fromIndex === 0) {
      setMessages([]);
      addMessage({
        id: 'intro',
        content: `🏢 **Testbolaget AB** — IT-konsult, omsättning 1,2 MSEK\n\nVi simulerar nu ett helt bokföringsår med ${total} transaktioner. Följ med när Air bokför allt från hyra och löner till bokslut och skatteberäkningar.`,
        sender: 'system',
        timestamp: new Date(),
        type: 'demo-label',
      });
    }

    for (let i = fromIndex; i < total; i++) {
      if (abortRef.current) break;

      if (pauseRef.current) {
        setState('paused');
        await waitForUnpause();
        if (abortRef.current) break;
        setState('playing');
      }

      setCurrentIndex(i);
      await runScenario(scenarios[i], i);

      if (abortRef.current) break;

      // Wait between scenarios
      const delayMs = SPEED_MS[speed];
      if (delayMs > 0) {
        await sleep(delayMs);
      } else {
        // Step mode — pause after each
        pauseRef.current = true;
        setState('paused');
        await waitForUnpause();
        if (abortRef.current) break;
        setState('playing');
      }
    }

    if (!abortRef.current) {
      // Final summary
      addMessage({
        id: 'summary',
        content: `🎉 **Bokföringsåret klart!**\n\n${total} transaktioner bokförda för Testbolaget AB.\nAir hanterade löpande bokföring, moms, löner och bokslut — helt automatiskt.`,
        sender: 'system',
        timestamp: new Date(),
        type: 'demo-label',
      });
      setCurrentIndex(total);
      setState('done');
    }
  }, [total, speed, scenarios, runScenario, addMessage]);

  const pause = useCallback(() => {
    pauseRef.current = true;
    setState('paused');
  }, []);

  const resume = useCallback(() => {
    pauseRef.current = false;
  }, []);

  const stop = useCallback(() => {
    abortRef.current = true;
    pauseRef.current = false;
    setState('idle');
    setCurrentIndex(0);
    setMessages([]);
  }, []);

  const jumpToQuarter = useCallback((quarter: string) => {
    abortRef.current = true;
    setTimeout(() => {
      const idx = scenarios.findIndex(s => s.quarter === quarter);
      if (idx >= 0) {
        play(idx);
      }
    }, 300);
  }, [scenarios, play]);

  const nextStep = useCallback(() => {
    pauseRef.current = false;
  }, []);

  return {
    state,
    speed,
    setSpeed,
    currentIndex,
    total,
    current,
    currentQuarter,
    quarterInfo,
    messages,
    isWaitingForAI,
    play,
    pause,
    resume,
    stop,
    jumpToQuarter,
    nextStep,
  };
}
