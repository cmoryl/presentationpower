/**
 * StagePhasesPanel — structural editor for the numbered stage module
 * (MV-PROC-STAGE-ORBITS).
 *
 * The generic "Editable fields" list can only retype what already exists; this
 * panel adds and removes the structure itself: up to six phases, each with its
 * numeral, name, medallion image seed and its own chain of up to six tasks
 * (icon + label + optional description). Every mutation runs through the pure
 * ops in `@/lib/stage-phases`, so the panel, the renderer and the export all
 * agree on capacity and numbering.
 */
import * as React from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { IconPicker } from "@/components/IconPicker";
import {
  MAX_PHASES,
  MAX_TASKS,
  MIN_PHASES,
  addPhase,
  addTask,
  movePhase,
  moveTask,
  patchPhase,
  patchTask,
  readPhases,
  removePhase,
  removeTask,
  type StagePhase,
} from "@/lib/stage-phases";

type Props = {
  stages: unknown;
  brandModeId?: string;
  onChange: (stages: StagePhase[]) => void;
};

const inputCls =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-black/30";
const btnCls =
  "inline-flex items-center gap-1 rounded-lg border border-black/15 px-2 py-1 text-xs text-black/70 transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-not-allowed disabled:opacity-40";

export function StagePhasesPanel({ stages, brandModeId, onChange }: Props) {
  const phases = React.useMemo(() => readPhases(stages), [stages]);

  return (
    <section
      aria-label="Phases and tasks"
      className="rounded-2xl border border-black/10 bg-white p-6"
    >
      <header className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xs uppercase tracking-widest text-black/50">Phases &amp; tasks</h3>
          <p className="mt-1 text-xs text-black/50">
            {phases.length} of {MAX_PHASES} phases · up to {MAX_TASKS} tasks each
          </p>
        </div>
        <button
          type="button"
          className={btnCls}
          disabled={phases.length >= MAX_PHASES}
          onClick={() => onChange(addPhase(phases))}
        >
          <Plus size={14} aria-hidden /> Add phase
        </button>
      </header>

      <div className="mt-5 space-y-5">
        {phases.map((phase, pi) => {
          const tasks = Array.isArray(phase.items) ? phase.items : [];
          return (
            <div key={pi} className="rounded-xl border border-black/10 bg-black/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-black/60">
                  Phase {pi + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className={btnCls}
                    aria-label={`Move phase ${pi + 1} earlier`}
                    disabled={pi === 0}
                    onClick={() => onChange(movePhase(phases, pi, -1))}
                  >
                    <ArrowUp size={14} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={btnCls}
                    aria-label={`Move phase ${pi + 1} later`}
                    disabled={pi === phases.length - 1}
                    onClick={() => onChange(movePhase(phases, pi, 1))}
                  >
                    <ArrowDown size={14} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={btnCls}
                    aria-label={`Remove phase ${pi + 1}`}
                    disabled={phases.length <= MIN_PHASES}
                    onClick={() => onChange(removePhase(phases, pi))}
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[80px_1fr_1fr]">
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-wider text-black/50">
                    Number
                  </span>
                  <input
                    className={`${inputCls} mt-1`}
                    value={String(phase.stepNumber ?? pi + 1)}
                    onChange={(e) =>
                      onChange(patchPhase(phases, pi, { stepNumber: e.target.value }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-wider text-black/50">
                    Phase name
                  </span>
                  <input
                    className={`${inputCls} mt-1`}
                    value={String(phase.label ?? "")}
                    maxLength={44}
                    onChange={(e) => onChange(patchPhase(phases, pi, { label: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-wider text-black/50">
                    Image seed
                  </span>
                  <input
                    className={`${inputCls} mt-1`}
                    value={String(phase.mediaSeed ?? "")}
                    onChange={(e) =>
                      onChange(patchPhase(phases, pi, { mediaSeed: e.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="mt-4 space-y-3">
                {tasks.map((task, ti) => (
                  <div
                    key={ti}
                    className="rounded-lg border border-black/10 bg-white p-3 sm:flex sm:items-start sm:gap-3"
                  >
                    <div className="shrink-0">
                      <IconPicker
                        value={typeof task.icon === "string" ? task.icon : null}
                        onChange={(name) =>
                          onChange(patchTask(phases, pi, ti, { icon: name ?? "" }))
                        }
                        {...(brandModeId
                          ? { ai: { brandModeId, slideContent: { stages: phases } } }
                          : {})}
                      />
                    </div>
                    <div className="mt-3 flex-1 space-y-2 sm:mt-0">
                      <input
                        className={inputCls}
                        aria-label={`Phase ${pi + 1} task ${ti + 1} label`}
                        placeholder="Task"
                        maxLength={44}
                        value={String(task.label ?? "")}
                        onChange={(e) =>
                          onChange(patchTask(phases, pi, ti, { label: e.target.value }))
                        }
                      />
                      <input
                        className={inputCls}
                        aria-label={`Phase ${pi + 1} task ${ti + 1} description`}
                        placeholder="Description (optional)"
                        maxLength={70}
                        value={String(task.body ?? "")}
                        onChange={(e) =>
                          onChange(patchTask(phases, pi, ti, { body: e.target.value }))
                        }
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-1 sm:mt-0">
                      <button
                        type="button"
                        className={btnCls}
                        aria-label={`Move task ${ti + 1} up in phase ${pi + 1}`}
                        disabled={ti === 0}
                        onClick={() => onChange(moveTask(phases, pi, ti, -1))}
                      >
                        <ArrowUp size={14} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={btnCls}
                        aria-label={`Move task ${ti + 1} down in phase ${pi + 1}`}
                        disabled={ti === tasks.length - 1}
                        onClick={() => onChange(moveTask(phases, pi, ti, 1))}
                      >
                        <ArrowDown size={14} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={btnCls}
                        aria-label={`Remove task ${ti + 1} from phase ${pi + 1}`}
                        disabled={tasks.length <= 1}
                        onClick={() => onChange(removeTask(phases, pi, ti))}
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className={btnCls}
                  disabled={tasks.length >= MAX_TASKS}
                  onClick={() => onChange(addTask(phases, pi))}
                >
                  <Plus size={14} aria-hidden /> Add task
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
