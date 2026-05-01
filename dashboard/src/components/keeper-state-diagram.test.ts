// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/preact"
import { afterEach, describe, expect, it, vi } from "vitest"
import "@testing-library/jest-dom"
import { html } from "htm/preact"
import { normalizePhase, transitionType, signalTone, badgeTone, PhaseBadge } from "./keeper-state-diagram"

afterEach(() => {
  cleanup()
})

describe("normalizePhase", () => {
  it.each([
    ["Offline", "Offline"],
    ["Running", "Running"],
    ["Failing", "Failing"],
    ["overflowed", "Overflowed"],
    ["handing_off", "HandingOff"],
    ["paused", "Paused"],
    ["dead", "Dead"],
  ])("maps %s to %s", (input, expected) => {
    expect(normalizePhase(input)).toBe(expected)
  })

  it("returns unmapped phase as-is", () => {
    expect(normalizePhase("custom_phase")).toBe("custom_phase")
  })

  it.each([
    [null, null],
    [undefined, null],
    ["", null],
  ])("returns null for %s", (input, expected) => {
    expect(normalizePhase(input)).toBe(expected)
  })
})

describe("transitionType", () => {
  it("extracts type from object", () => {
    expect(transitionType({ type: "operator_approve" })).toBe("operator approve")
  })

  it("returns 'event' for object with empty type", () => {
    expect(transitionType({ type: "  " })).toBe("event")
  })

  it("returns 'event' for object without type", () => {
    expect(transitionType({ foo: "bar" })).toBe("event")
  })

  it.each([
    [null, "event"],
    [undefined, "event"],
    ["string", "event"],
    [42, "event"],
  ])("returns 'event' for %s", (input, expected) => {
    expect(transitionType(input)).toBe(expected)
  })
})

describe("signalTone", () => {
  it.each([
    ["bad", "bad"],
    ["warn", "warn"],
    ["ok", "ok"],
  ])("maps %s to StatusChip tone %s", (severity, expected) => {
    expect(signalTone(severity)).toBe(expected)
  })

  it("warns on unknown severity and returns warn tone", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(signalTone("unknown")).toBe("warn")
    expect(warnSpy).toHaveBeenCalledWith(
      "[signalTone] unknown severity; rendering as warn",
      { severity: "unknown" },
    )
    warnSpy.mockRestore()
  })

  it.each([
    [null, "warn"],
    [undefined, "warn"],
    ["", "warn"],
  ])("returns warn tone for %s without console warning", (input, expected) => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(signalTone(input)).toBe(expected)
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

describe("PhaseBadge", () => {
  it("renders through the shared StatusChip primitive", () => {
    render(html`<${PhaseBadge} accent>composite Running<//>`)

    const chip = screen.getByText("composite Running").closest("[data-status-chip]")
    expect(chip).toHaveAttribute("data-status-chip-tone", "info")
    expect(chip).toHaveAttribute("data-status-chip-uppercase", "false")
  })
})

describe("badgeTone", () => {
  const okClasses = "border-[rgba(34,197,94,0.24)] bg-[var(--emerald-8)] text-[var(--color-status-ok)]"
  const errClasses = "border-[rgba(239,68,68,0.24)] bg-[var(--bad-10)] text-[var(--color-status-err)]"

  it("returns ok tone for true", () => {
    expect(badgeTone(true)).toBe(okClasses)
  })

  it("returns err tone for false", () => {
    expect(badgeTone(false)).toBe(errClasses)
  })
})
