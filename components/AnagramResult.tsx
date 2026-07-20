"use client";

import { useEffect, useState } from "react";
import { ArchiveCluePanel } from "@/components/ArchiveCluePanel";
import { AnswerChecker } from "@/components/AnswerChecker";
import { BuyCreditsButtons } from "@/components/BuyCreditsButtons";
import { ClueImprovementEditor } from "@/components/ClueImprovementEditor";
import { DifficultyToggle } from "@/components/DifficultyToggle";
import { ShareClueMenu } from "@/components/ShareClueMenu";
import { HOMOPHONE_ARCHIVE_INSPIRATION } from "@/lib/site-config";
import { formatHomophoneLexemeDisplay } from "@/lib/homophone-spelling";
import type { CreditPackId } from "@/lib/credit-packs";
import type { AnagramClueResult, AnagramDifficulty } from "@/lib/types";

interface AnagramResultProps {
  result: AnagramClueResult;
  inspiration: string;
  difficulty?: AnagramDifficulty;
  onDifficultyChange?: (difficulty: AnagramDifficulty) => void;
  error?: string | null;
  onNew: () => void;
  onRetry: () => void;
  retryLoading?: boolean;
  canGenerate?: boolean;
  onBuyCredits?: (packId: CreditPackId) => void;
  checkoutPackId?: CreditPackId | null;
  /** Admin test account — show Claude call trace in Details. */
  showClaudeTrace?: boolean;
  variant?: "anagram" | "homophone";
}

function PromptBlock({
  title,
  system,
  user,
  response,
}: {
  title: string;
  system: string;
  user: string;
  response?: string;
}) {
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
      <pre className="mb-3 overflow-x-auto whitespace-pre-wrap rounded bg-ink/5 p-3 font-mono text-xs text-ink/85">
        {user}
      </pre>
      {response !== undefined && (
        <>
          <p className="mb-1 text-xs font-medium text-ink/70">Claude response</p>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-emerald-50 p-3 font-mono text-xs text-ink/85">
            {response || "(no response — call failed or timed out)"}
          </pre>
        </>
      )}
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
  checkoutPackId,
  showClaudeTrace = false,
  variant = "anagram",
}: AnagramResultProps) {
  const isHomophone = variant === "homophone" || result.clueType === "homophone";
  const fodderLabel = isHomophone ? "Homophone fodder" : "Anagram fodder";
  const [showPrompts, setShowPrompts] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [inspirationRevealed, setInspirationRevealed] = useState(false);
  const [showCreditPacks, setShowCreditPacks] = useState(false);
  const [originalClue, setOriginalClue] = useState(result.clue.clue);
  const [displayClue, setDisplayClue] = useState(result.clue.clue);
  const [improvementNotes, setImprovementNotes] = useState("");
  const { clue, answerContext, surfaceExplanation, homophoneBreakdown, claudeTrace } =
    result;

  useEffect(() => {
    if (canGenerate) setShowCreditPacks(false);
  }, [canGenerate]);

  useEffect(() => {
    setOriginalClue(clue.clue);
    setDisplayClue(clue.clue);
    setImprovementNotes("");
    setRevealed(false);
    setShowPrompts(false);
    setInspirationRevealed(false);
    setShowCreditPacks(false);
  }, [clue.clue, clue.answer]);

  const isEdited =
    displayClue.trim() !== originalClue.trim() || improvementNotes.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {!isHomophone &&
            (inspirationRevealed ? (
              <>
                <h2 className="font-display text-2xl font-bold text-ink">
                  {inspiration.trim()}
                </h2>
                <button
                  type="button"
                  onClick={() => setInspirationRevealed(false)}
                  className="mt-2 text-sm font-medium text-ink/55 underline-offset-2 hover:text-ink hover:underline"
                >
                  Hide Inspiration
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setInspirationRevealed(true)}
                aria-expanded={false}
                className="text-sm font-medium text-ink/55 underline-offset-2 hover:text-ink hover:underline"
              >
                Show Inspiration
              </button>
            ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {canGenerate ? (
            <button
              type="button"
              onClick={onRetry}
              disabled={retryLoading}
              className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-cream/80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retryLoading ? "Generating…" : "Generate"}
            </button>
          ) : showCreditPacks && onBuyCredits ? null : (
            <button
              type="button"
              onClick={() => setShowCreditPacks(true)}
              className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-cream/80"
            >
              Get Credits
            </button>
          )}
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

      {!isHomophone && difficulty !== undefined && onDifficultyChange && (
        <DifficultyToggle
          value={difficulty}
          onChange={onDifficultyChange}
          disabled={retryLoading}
        />
      )}

      {!canGenerate && !error && showCreditPacks && onBuyCredits && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink/70">Choose a credit pack</p>
          <BuyCreditsButtons
            onBuy={onBuyCredits}
            loadingPackId={checkoutPackId}
            emphasis="need-credits"
          />
        </div>
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
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {isEdited && (
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
                Your version
              </p>
            )}
            <p className="font-display text-lg leading-relaxed text-ink">
              {displayClue}
            </p>
          </div>
          <ShareClueMenu clueText={displayClue} className="shrink-0" />
        </div>
        <AnswerChecker answer={clue.answer} clue={displayClue} />
        {revealed && (
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink/55">Answer</dt>
              <dd className="font-mono font-semibold text-ink">
                {isHomophone
                  ? formatHomophoneLexemeDisplay(clue.answer)
                  : clue.answer}
              </dd>
            </div>
            <div>
              <dt className="text-ink/55">{fodderLabel}</dt>
              <dd className="font-mono text-ink">
                {isHomophone && clue.anagramFodder
                  ? formatHomophoneLexemeDisplay(clue.anagramFodder)
                  : clue.anagramFodder || "—"}
              </dd>
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

      <ClueImprovementEditor
        originalClue={originalClue}
        clueText={displayClue}
        improvementNotes={improvementNotes}
        onApply={(nextClue, nextNotes) => {
          setDisplayClue(nextClue);
          setImprovementNotes(nextNotes);
        }}
        onReset={() => {
          setDisplayClue(originalClue);
          setImprovementNotes("");
        }}
        disabled={retryLoading}
      />

      <ArchiveCluePanel
        inspiration={
          isHomophone ? HOMOPHONE_ARCHIVE_INSPIRATION : inspiration
        }
        difficulty={difficulty ?? result.difficulty ?? "easy"}
        clue={clue}
        displayClue={displayClue}
        originalClue={originalClue}
        improvementNotes={improvementNotes}
        variant={isHomophone ? "homophone" : "anagram"}
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

      {revealed && isHomophone && homophoneBreakdown && (
        <div className="rounded-2xl border border-ink/10 bg-white/50 p-6">
          <h3 className="mb-3 font-display text-lg font-semibold text-ink">
            Clue breakdown
          </h3>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-ink/55">Definition</dt>
              <dd className="mt-1 leading-relaxed text-ink">
                <span className="font-medium">
                  {homophoneBreakdown.definition.surfaceHint}
                </span>
                {" → "}
                <span className="font-mono font-semibold">
                  {formatHomophoneLexemeDisplay(homophoneBreakdown.definition.word)}
                </span>
                {" — "}
                {homophoneBreakdown.definition.partOfSpeech && (
                  <span className="mr-1 text-xs uppercase tracking-wide text-ink/45">
                    {homophoneBreakdown.definition.partOfSpeech}
                  </span>
                )}
                {homophoneBreakdown.definition.dictionaryDefinition}
              </dd>
            </div>
            <div>
              <dt className="text-ink/55">Homophone</dt>
              <dd className="mt-1 leading-relaxed text-ink">
                <span className="font-medium">
                  {homophoneBreakdown.homophone.surfaceHint}
                </span>
                {" → "}
                <span className="font-mono font-semibold">
                  {formatHomophoneLexemeDisplay(homophoneBreakdown.homophone.word)}
                </span>
                {" — "}
                {homophoneBreakdown.homophone.partOfSpeech && (
                  <span className="mr-1 text-xs uppercase tracking-wide text-ink/45">
                    {homophoneBreakdown.homophone.partOfSpeech}
                  </span>
                )}
                {homophoneBreakdown.homophone.dictionaryDefinition}
                {" — indicator: "}
                <span className="font-medium">
                  {homophoneBreakdown.homophone.indicator}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      )}

      {revealed && answerContext && !isHomophone && (
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

      {revealed && showClaudeTrace && (
      <div>
        <button
          type="button"
          onClick={() => setShowPrompts((v) => !v)}
          className="text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          {showPrompts ? "Hide" : "Show"} Claude call trace
        </button>

        {showPrompts && (claudeTrace?.length ?? 0) > 0 && (
          <div className="mt-4 space-y-4">
            {claudeTrace!.map((call) => (
              <PromptBlock
                key={`claude-${call.order}`}
                title={`${call.order}. ${call.label}`}
                system={call.system}
                user={call.user}
                response={call.response}
              />
            ))}
          </div>
        )}

        {showPrompts && (claudeTrace?.length ?? 0) === 0 && (
          <p className="mt-3 text-sm text-ink/55">
            No Claude calls were recorded for this clue.
          </p>
        )}
      </div>
      )}
    </div>
  );
}
