"use client";
// Mode-branching answer panel: choice grid for easy/practice/custom, text inputs for hard modes, Give Up button.
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import CustomModeInput from "./CustomModeInput";
import StandardModeInput from "./StandardModeInput";

const HARD_MODES = ["standard", "hardcore", "time_attack"];
const CHOICE_MODES = ["easy", "practice", "custom"];

const PROMPT_LABELS: Record<string, string> = {
  easy: "Choose the correct make & model",
  custom: "Choose the correct make & model",
  standard: "Type make, model & year exactly",
  hardcore: "Type make, model & year exactly",
  time_attack: "Identify before the image reveals!",
  practice: "Choose the correct make & model",
};

interface Props {
  mode: string;
  currentIndex: number;
  roundState: "answering" | "revealed";
  choices: { vehicleId: string; label: string }[];
  selectedEasyId: string | null;
  isSubmitting: boolean;
  makes: string[];
  mediumYearGuessing: boolean;
  onEasyAnswer: (vehicleId: string) => void;
  onMediumSubmit: (make: string, model: string, year?: string) => void;
  onHardSubmit: (make: string, model: string, year: string) => void;
  onGiveUp: () => void;
}

export function AnswerSection({
  mode,
  currentIndex,
  roundState,
  choices,
  selectedEasyId,
  isSubmitting,
  makes,
  mediumYearGuessing,
  onEasyAnswer,
  onMediumSubmit,
  onHardSubmit,
  onGiveUp,
}: Props) {
  return (
    <AnimatePresence mode="wait">
      {roundState === "answering" && (
        <motion.div
          key={`answer-${currentIndex}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="glass-panel rounded-2xl p-5 border border-white/10"
        >
          <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-4">
            {PROMPT_LABELS[mode] ?? ""}
          </p>

          {CHOICE_MODES.includes(mode) && (
            <div className="grid grid-cols-2 gap-3">
              {choices.map((choice, i) => {
                const isSelected = selectedEasyId === choice.vehicleId;
                return (
                  <motion.button
                    key={choice.vehicleId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => onEasyAnswer(choice.vehicleId)}
                    disabled={selectedEasyId !== null}
                    className={cn(
                      "relative group p-4 rounded-xl border-2 text-left transition-all duration-200 font-bold text-sm tracking-wide overflow-hidden disabled:pointer-events-none",
                      isSelected && isSubmitting
                        ? "border-primary/60 bg-primary/10"
                        : "border-white/10 bg-white/5 hover:border-primary/60 hover:bg-primary/10",
                    )}
                  >
                    <span className="absolute top-2 right-3 text-xs font-mono text-white/20 group-hover:text-primary/50 transition-colors">
                      {isSelected && isSubmitting ? (
                        <span className="inline-block w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      ) : (
                        String.fromCharCode(65 + i)
                      )}
                    </span>
                    {choice.label}
                  </motion.button>
                );
              })}
            </div>
          )}

          {mode === "custom" && (
            <CustomModeInput
              makes={makes}
              showYear={mediumYearGuessing}
              disabled={false}
              onSubmit={onMediumSubmit}
            />
          )}

          {HARD_MODES.includes(mode) && (
            <StandardModeInput
              makes={makes}
              disabled={false}
              onSubmit={onHardSubmit}
            />
          )}

          <button
            onClick={onGiveUp}
            className="mt-3 w-full py-2 rounded-xl border border-white/10 text-white/40 text-xs font-bold tracking-widest uppercase hover:border-white/20 hover:text-white/60 transition-all"
          >
            Give Up
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
