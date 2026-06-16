"use client";

import { useEffect, useState } from "react";
import { ArchiveCluePanel } from "@/components/ArchiveCluePanel";
import { AnswerChecker } from "@/components/AnswerChecker";
import { DifficultyToggle } from "@/components/DifficultyToggle";
import type { AnagramClueResult, AnagramDifficulty } from "@/lib/types";

interface AnagramResultProps {
  result: AnagramClueResult;
  inspiration: string;
  difficulty: AnagramDifficulty;
  onDifficultyChange: (difficulty: AnagramDifficulty) => void;
  error?: string | null;
  onNew: () => void;
  onRetry: () => void;
  retryLoading?: boolean;
  canGenerate?: boolean;
  onBuyCredits?: () => void;
}

function PromptBlock({ title, system, user }: { title: string; system: string; user: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white/60 p-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/55">
        {title}
      </h4>
      <p className="mb-1 text-xs font-medium text-ink/70">System</p>
      <pre className="mb-3 overflow-x-auto whitespace-pre-wrap rounded bg-ink/5 p-3 font-mono text-xs text-ink/85">
        {system}
      </pre>
      <p className="mb-1 text-xs font-medium text-ink/70">User</p>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-ink/5 p-3 font-mono text-xs text-ink/85">
        {user}
      </pre>
    </div>
  );
}

export function AnagramResult({
  result,
  inspiration,
  difficulty,
  onDifficultyChange,
  error,
  onNew,
  onRetry,
  retryLoading = false,
  canGenerate = true,
  onBuyCredits,
}: AnagramResultProps) {
  const [showPrompts, setShowPrompts] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [inspirationRevealed, setInspirationRevealed] = useState(false);
  const { clue, answerContext, surfaceExplanation, prompts } = result;
  const promptTurns = {
    repairs: prompts?.repairs ?? [],
    answer: prompts?.answer ?? [],
    pairSelect: prompts?.pairSelect ?? [],
    templatePolish: prompts?.templatePolish ?? [],
    indicatorRefine: prompts?.indicatorRefine ?? [],
  };

  useEffect(() => {
    setRevealed(false);
    setShowPrompts(false);
    setInspirationRevealed(false);
  }, [clue.clue, clue.answer]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {inspirationRevealed ? (
            <>
              <h2 className="font-display text-2xl font-bold text-ink">
                {inspiration.trim()}
              </h2>
              {result.autoThemed && (
                <p className="mt-1 text-sm text-ink/55">
                  Theme chosen for you.
                </p>
              )}
              <button
                type="button"
                onClick={() => setInspirationRevealed(false)}
                className="mt-2 text-sm font-medium text-ink/55 underline-offset-2 hover:text-ink hover:underline"
              >
                Hide inspiration
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setInspirationRevealed(true)}
              aria-expanded={false}
              className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-cream/80"
            >
              Inspiration
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRetry}
            disabled={retryLoading || !canGenerate}
            className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-cream/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {retryLoading ? "Generating…" : "New Clue"}
          </button>
          <button
            type="button"
            onClick={onNew}
            disabled={retryLoading}
            className="rounded-lg bg-ink px-3 py-2 text-sm font-medium text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Restart
          </button>
        </div>
      </div>

      <DifficultyToggle
        value={difficulty}
        onChange={onDifficultyChange}
        disabled={retryLoading}
      />

      {!canGenerate && !error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No credits left.{" "}
          {onBuyCredits ? (
            <button
              type="button"
              onClick={onBuyCredits}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Add credits
            </button>
          ) : (
            "Add credits to generate another clue."
          )}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-ink/10 bg-cream/50 p-6 shadow-sm">
        <p className="font-display text-lg leading-relaxed text-ink">{clue.clue}</p>
        <AnswerChecker answer={clue.answer} clue={clue.clue} />
        {revealed && (
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink/55">Answer</dt>
              <dd className="font-mono font-semibold text-ink">{clue.answer}</dd>
            </div>
            <div>
              <dt className="text-ink/55">Anagram fodder</dt>
              <dd className="font-mono text-ink">{clue.anagramFodder || "—"}</dd>
            </div>
            {clue.anagramIndicator && (
              <div>
                <dt className="text-ink/55">Indicator (setter)</dt>
                <dd className="text-ink">{clue.anagramIndicator}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      <ArchiveCluePanel
        inspiration={inspiration}
        difficulty={difficulty}
        clue={clue}
      />

      <div>
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="rounded-lg border border-ink/15 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-cream/80"
        >
          {revealed ? "Hide details" : "Details"}
        </button>
      </div>

      {revealed && surfaceExplanation && (
        <div className="rounded-2xl border border-ink/10 bg-white/50 p-6">
          <h3 className="mb-3 font-display text-lg font-semibold text-ink">
            How the clue works
          </h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-ink/55">Definition</dt>
              <dd className="mt-1 leading-relaxed text-ink">
                {surfaceExplanation.definition}
              </dd>
            </div>
            <div>
              <dt className="text-ink/55">Wordplay</dt>
              <dd className="mt-1 leading-relaxed text-ink">
                {surfaceExplanation.wordplay}
              </dd>
            </div>
            {surfaceExplanation.linkingWords && (
              <div>
                <dt className="text-ink/55">Linking words</dt>
                <dd className="mt-1 leading-relaxed text-ink">
                  {surfaceExplanation.linkingWords}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-ink/55">Walkthrough</dt>
              <dd className="mt-1 leading-relaxed text-ink">
                {surfaceExplanation.walkthrough}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {revealed && answerContext && (
        <div className="rounded-2xl border border-ink/10 bg-white/50 p-6">
          <h3 className="mb-3 font-display text-lg font-semibold text-ink">
            About {clue.answer}
          </h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-ink/55">Dictionary definition</dt>
              <dd className="mt-1 leading-relaxed text-ink">
                {answerContext.partOfSpeech && (
                  <span className="mr-2 text-xs uppercase tracking-wide text-ink/45">
                    {answerContext.partOfSpeech}
                  </span>
                )}
                {answerContext.dictionaryDefinition}
              </dd>
            </div>
            <div>
              <dt className="text-ink/55">Link to your topic</dt>
              <dd className="mt-1 leading-relaxed text-ink">
                {answerContext.topicRelation}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {revealed && (
      <div>
        <button
          type="button"
          onClick={() => setShowPrompts((v) => !v)}
          className="text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          {showPrompts ? "Hide" : "Show"} exact prompts sent to Claude
        </button>

        {showPrompts && prompts?.setter && (
          <div className="mt-4 space-y-4">
            <PromptBlock
              title="1. Setter (initial request)"
              system={prompts.setter.system}
              user={prompts.setter.user}
            />
            {promptTurns.repairs.map((p, i) => (
              <PromptBlock
                key={`repair-${i}`}
                title={`Repair (full clue) ${i + 1}`}
                system={p.system}
                user={p.user}
              />
            ))}
            {promptTurns.answer.map((p, i) => (
              <PromptBlock
                key={`answer-${i}`}
                title={`Theme answer suggestions ${i + 1}`}
                system={p.system}
                user={p.user}
              />
            ))}
            {promptTurns.pairSelect.map((p, i) => (
              <PromptBlock
                key={`pair-${i}`}
                title={`Pair selection ${i + 1}`}
                system={p.system}
                user={p.user}
              />
            ))}
            {promptTurns.templatePolish.map((p, i) => (
              <PromptBlock
                key={`polish-${i}`}
                title={`Template polish ${i + 1}`}
                system={p.system}
                user={p.user}
              />
            ))}
            {promptTurns.indicatorRefine.map((p, i) => (
              <PromptBlock
                key={`refine-${i}`}
                title={`Indicator refine ${i + 1}`}
                system={p.system}
                user={p.user}
              />
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
