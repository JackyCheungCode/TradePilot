import { CharacterMark, type CharacterState, type ColorId, type ShapeId } from "@aora-bot/react";
import { useAgentAppearance } from "../hooks/useAgentAppearance";

export function AgentOrbIcon({ className, agentKey = "default", state = "idle", sizePx = 32 }: {
  className?: string; agentKey?: string; state?: CharacterState; sizePx?: number;
}) {
  const appearance = useAgentAppearance(agentKey);
  return <CharacterMark
    className={className}
    shape={appearance.shape as ShapeId}
    color={appearance.color as ColorId}
    styleId={appearance.styleId}
    variant={appearance.variant as never}
    face={appearance.face}
    state={state}
    sizePx={sizePx}
    autoPause
    entryEffects={false}
    seed={"tradepilot-" + agentKey}
  />;
}
