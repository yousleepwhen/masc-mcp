// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render } from "preact"
import { html } from "htm/preact"
import {
  isExactTurnProjection,
  terminalTone,
  TurnFsmDetailPanel,
  turnFsmChipTone,
} from "./turn-fsm-detail-panel"
import type { KeeperCompositeSnapshot } from "../api/keeper"

vi.mock("./common/cytoscape-fsm", () => ({
  CytoscapeFsm: () => html`<div data-testid="fsm-graph"></div>`,
}))

type SnapshotOverrides = Partial<
  Omit<KeeperCompositeSnapshot, "cascade" | "compaction" | "decision" | "execution" | "invariants" | "measurement">
> & {
  cascade?: Partial<KeeperCompositeSnapshot["cascade"]>
  compaction?: Partial<KeeperCompositeSnapshot["compaction"]>
  decision?: Partial<KeeperCompositeSnapshot["decision"]>
  execution?: Partial<NonNullable<KeeperCompositeSnapshot["execution"]>>
  invariants?: Partial<KeeperCompositeSnapshot["invariants"]>
  measurement?: Partial<KeeperCompositeSnapshot["measurement"]>
}

function compositeSnapshot(overrides: SnapshotOverrides = {}): KeeperCompositeSnapshot {
  const base: KeeperCompositeSnapshot = {
    correlation_id: "keeper-1:run-1",
    run_id: "run-1",
    ts: 0,
    phase: "Running",
    turn_phase: "idle",
    decision: { stage: "undecided" },
    cascade: { state: "idle" },
    compaction: { stage: "accumulating" },
    measurement: { captured: false },
    invariants: {
      phase_turn_alignment: true,
      no_cascade_before_measurement: true,
      compaction_atomicity: true,
      event_priority_monotone: true,
    },
    is_live: true,
    last_outcome: null,
    recommended_actions: [],
  }
  const baseExecution: NonNullable<KeeperCompositeSnapshot["execution"]> = {
    latest_receipt_present: true,
    recorded_at: null,
    outcome: null,
    terminal_reason_code: null,
    operator_disposition: null,
    operator_disposition_reason: null,
    model_used: null,
    stop_reason: null,
    tool_contract_result: null,
    duration_ms: null,
    error: null,
    cascade: null,
    tool_surface: null,
  }
  const {
    cascade,
    compaction,
    decision,
    execution,
    invariants,
    measurement,
    ...rest
  } = overrides

  return {
    ...base,
    ...rest,
    decision: { ...base.decision, ...decision },
    cascade: { ...base.cascade, ...cascade },
    compaction: { ...base.compaction, ...compaction },
    measurement: { ...base.measurement, ...measurement },
    invariants: { ...base.invariants, ...invariants },
    execution: execution ? { ...baseExecution, ...execution } : base.execution,
  }
}

describe("turnFsmChipTone", () => {
  it.each([
    ["accent", "info"],
    ["neutral", "neutral"],
    ["warn", "warn"],
    ["err", "bad"],
    ["ok", "ok"],
  ] as const)("maps %s to StatusChip tone %s", (tone, expected) => {
    expect(turnFsmChipTone(tone)).toBe(expected)
  })
})

describe("terminalTone", () => {
  it.each([
    ["done", "ok"],
    ["skipped", "ok"],
    ["cancelled", "warn"],
    ["failed", "err"],
    ["error", "err"],
    ["unknown", "neutral"],
    ["", "neutral"],
    [null, "neutral"],
    [undefined, "neutral"],
  ])("maps %s to %s", (outcome, expected) => {
    expect(terminalTone(outcome)).toBe(expected)
  })
})

describe("isExactTurnProjection", () => {
  it.each([
    ["idle", "idle", true],
    ["AWAITING_TOOL", "awaiting_tool", true],
    ["awaiting_tool", "awaiting_tool_result", true],
    ["  awaiting_tool  ", "awaiting_tool_result", true],
    ["done", "done", true],
    ["done", "idle", false],
    ["awaiting_tool", "awaiting_tool", true],
    ["unknown", null, false],
    ["", "idle", false],
  ])("isExactTurnProjection(%s, %s) → %s", (raw, projected, expected) => {
    expect(isExactTurnProjection(raw, projected)).toBe(expected)
  })
})

describe("TurnFsmDetailPanel", () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    document.body.removeChild(container)
  })

  it("renders turn state and receipt badges through StatusChip", () => {
    const snapshot = compositeSnapshot({
      turn_phase: "awaiting_tool",
      execution: {
        outcome: "failed",
        terminal_reason_code: "tool_contract",
        tool_contract_result: "violated",
        model_used: "glm-4.5",
      },
    })

    render(html`<${TurnFsmDetailPanel} snapshot=${snapshot} />`, container)

    const chips = [...container.querySelectorAll("[data-status-chip]")]
    expect(chips.map(chip => chip.textContent?.trim())).toEqual(expect.arrayContaining([
      "awaiting_tool_result",
      "KTC awaiting_tool",
      "TLA awaiting_tool",
      "receipt failed",
      "reason tool_contract",
      "tool violated",
      "model glm-4.5",
    ]))
    expect(chips.map(chip => chip.getAttribute("data-status-chip-tone"))).toEqual(expect.arrayContaining([
      "info",
      "neutral",
      "bad",
    ]))
    expect(chips.every(chip => chip.getAttribute("data-status-chip-uppercase") === "false")).toBe(true)
  })
})
