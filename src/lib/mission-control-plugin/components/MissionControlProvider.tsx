import React, { createContext, useContext, type ReactNode } from 'react';
import { useMissionControl, type MissionControlState, type MissionControlActions } from '../hooks/useMissionControl';
import { type MissionControlConfig } from '../config/mission-control.config';

interface MissionControlContextValue extends MissionControlState {
  actions: MissionControlActions;
}

const MissionControlContext = createContext<MissionControlContextValue | null>(null);

interface MissionControlProviderProps {
  children: ReactNode;
  config?: Partial<MissionControlConfig>;
}

export function MissionControlProvider({ children, config }: MissionControlProviderProps) {
  const missionControl = useMissionControl(config);

  return (
    <MissionControlContext.Provider value={missionControl}>
      {children}
    </MissionControlContext.Provider>
  );
}

export function useMissionControlContext() {
  const context = useContext(MissionControlContext);
  
  if (!context) {
    throw new Error('useMissionControlContext must be used within a MissionControlProvider');
  }
  
  return context;
}
