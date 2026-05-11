import { OkrBotAvatar } from "./okr-bot-avatar";
import { OkrBotProposalCard } from "./okr-bot-proposal-card";
import type { OkrBotEntityOption } from "./types";
import type { OkrBotProposal } from "@/lib/okrs";
import type { ReactNode } from "react";
import { useState } from "react";

export type OkrBotUiResponse = {
  collapsed?: boolean;
  proposal: OkrBotProposal;
  type: "proposal";
};

export type OkrBotChatMessage = {
  id: string;
  isThinking?: boolean;
  proposal?: OkrBotProposal;
  role: "assistant" | "user";
  text: string;
  uiResponse?: OkrBotUiResponse;
};

type OkrBotMessageProps = {
  activeProposalMessageId?: string | null;
  fallbackMessage: string;
  messages: OkrBotChatMessage[];
  onConfirmProposal?: () => void;
  onDiscardProposal?: () => void;
  onEditProposal?: () => void;
  onSelectOption?: (option: OkrBotEntityOption) => void;
  options?: OkrBotEntityOption[];
  optionsDisabled?: boolean;
  optionsSuggestionQuery?: string;
  optionsVariant?: "default" | "key_result_picker";
  projectSourceRecordId?: string;
};

type RankedOption = OkrBotEntityOption & {
  suggestionReason?: string;
  suggestionScore?: number;
};

function renderMarkdownInline(text: string, keyPrefix: string) {
  const nodes: ReactNode[] = [];
  const tokenPattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let cursor = 0;
  let tokenIndex = 0;

  for (const match of text.matchAll(tokenPattern)) {
    const matchIndex = match.index ?? 0;
    const token = match[0];

    if (matchIndex > cursor) {
      nodes.push(text.slice(cursor, matchIndex));
    }

    if (token.startsWith("`")) {
      nodes.push(<code key={`${keyPrefix}-code-${tokenIndex}`}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={`${keyPrefix}-strong-${tokenIndex}`}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={`${keyPrefix}-em-${tokenIndex}`}>{token.slice(1, -1)}</em>);
    }

    cursor = matchIndex + token.length;
    tokenIndex += 1;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function renderBotMarkdown(content: string) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraphLines: string[] = [];
  let unorderedItems: string[] = [];
  let orderedItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;

    const blockIndex = blocks.length;
    blocks.push(
      <p key={`paragraph-${blockIndex}`}>
        {renderMarkdownInline(paragraphLines.join(" "), `paragraph-${blockIndex}`)}
      </p>
    );
    paragraphLines = [];
  };

  const flushUnorderedList = () => {
    if (unorderedItems.length === 0) return;

    const blockIndex = blocks.length;
    blocks.push(
      <ul key={`ul-${blockIndex}`}>
        {unorderedItems.map((item, itemIndex) => (
          <li key={`ul-${blockIndex}-${itemIndex}`}>
            {renderMarkdownInline(item, `ul-${blockIndex}-${itemIndex}`)}
          </li>
        ))}
      </ul>
    );
    unorderedItems = [];
  };

  const flushOrderedList = () => {
    if (orderedItems.length === 0) return;

    const blockIndex = blocks.length;
    blocks.push(
      <ol key={`ol-${blockIndex}`}>
        {orderedItems.map((item, itemIndex) => (
          <li key={`ol-${blockIndex}-${itemIndex}`}>
            {renderMarkdownInline(item, `ol-${blockIndex}-${itemIndex}`)}
          </li>
        ))}
      </ol>
    );
    orderedItems = [];
  };

  const flushLists = () => {
    flushUnorderedList();
    flushOrderedList();
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushLists();
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
    const unorderedMatch = /^[-*]\s+(.+)$/.exec(line);
    const orderedMatch = /^\d+[.)]\s+(.+)$/.exec(line);

    if (headingMatch) {
      flushParagraph();
      flushLists();
      const blockIndex = blocks.length;
      blocks.push(
        <strong className="okr-bot-markdown-heading" key={`heading-${blockIndex}`}>
          {renderMarkdownInline(headingMatch[2], `heading-${blockIndex}`)}
        </strong>
      );
      continue;
    }

    if (unorderedMatch) {
      flushParagraph();
      flushOrderedList();
      unorderedItems.push(unorderedMatch[1]);
      continue;
    }

    if (orderedMatch) {
      flushParagraph();
      flushUnorderedList();
      orderedItems.push(orderedMatch[1]);
      continue;
    }

    flushLists();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushLists();

  return <div className="okr-bot-markdown">{blocks}</div>;
}

function formatUiLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function getUiResponseSummary(uiResponse: OkrBotUiResponse) {
  if (uiResponse.type === "proposal") {
    return `${formatUiLabel(uiResponse.proposal.operation)} proposal · ${formatUiLabel(uiResponse.proposal.targetType)}`;
  }

  return "Response UI";
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getOptionSearchText(option: OkrBotEntityOption) {
  return [option.id, option.label, option.meta, option.searchText].filter(Boolean).join(" ");
}

function getQueryTokens(query: string) {
  return [...new Set(normalizeSearchText(query).match(/[a-z0-9#]+/g) ?? [])].filter((token) => token.length > 2);
}

function rankOptionsForQuery(options: OkrBotEntityOption[], query: string): RankedOption[] {
  const tokens = getQueryTokens(query);

  if (tokens.length === 0) {
    return [];
  }

  return options
    .map((option) => {
      const searchableText = normalizeSearchText(getOptionSearchText(option));
      const matchedTokens = tokens.filter((token) => searchableText.includes(token));
      const exactLabelBoost = normalizeSearchText(option.label).includes(normalizeSearchText(query.trim())) ? 3 : 0;
      const suggestionScore = matchedTokens.length + exactLabelBoost;

      return {
        ...option,
        suggestionReason:
          matchedTokens.length > 0
            ? `Suggested because it matches: ${matchedTokens.slice(0, 5).join(", ")}.`
            : undefined,
        suggestionScore
      };
    })
    .filter((option) => (option.suggestionScore ?? 0) > 0)
    .sort((left, right) => (right.suggestionScore ?? 0) - (left.suggestionScore ?? 0))
    .slice(0, 5);
}

function OkrBotSelectableOptions({
  disabled,
  onSelectOption,
  options,
  suggestionQuery,
  variant
}: {
  disabled: boolean;
  onSelectOption: (option: OkrBotEntityOption) => void;
  options: OkrBotEntityOption[];
  suggestionQuery?: string;
  variant: "default" | "key_result_picker";
}) {
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(variant === "key_result_picker" && Boolean(suggestionQuery?.trim()));
  const normalizedSearch = normalizeSearchText(search.trim());
  const isKeyResultPicker = variant === "key_result_picker";
  const filteredOptions = options.filter((option) =>
    normalizedSearch ? normalizeSearchText(getOptionSearchText(option)).includes(normalizedSearch) : true
  );
  const suggestedOptions =
    isKeyResultPicker && showSuggestions ? rankOptionsForQuery(filteredOptions, suggestionQuery ?? "") : [];
  const suggestedIds = new Set(suggestedOptions.map((option) => option.id));
  const remainingOptions = filteredOptions.filter((option) => !suggestedIds.has(option.id));

  const renderOption = (option: RankedOption) => {
    const tooltip = option.suggestionReason || option.label;

    return (
      <button
        disabled={disabled}
        key={option.id}
        onClick={() => onSelectOption(option)}
        title={tooltip}
        type="button"
      >
        <strong>{option.label}</strong>
      </button>
    );
  };

  return (
    <div className="okr-bot-options-shell">
      {isKeyResultPicker ? (
        <div className="okr-bot-options-toolbar">
          <input
            aria-label="Search Key Results"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Key Results..."
            type="search"
            value={search}
          />
          <button
            disabled={disabled || !suggestionQuery?.trim()}
            onClick={() => setShowSuggestions((currentValue) => !currentValue)}
            type="button"
          >
            {showSuggestions ? "Hide suggestions" : "Suggest matches"}
          </button>
        </div>
      ) : null}

      {filteredOptions.length === 0 ? (
        <p className="okr-bot-options-empty">
          {isKeyResultPicker ? "No Key Results match your search." : "No options available."}
        </p>
      ) : (
        <div className="okr-bot-options-scroll">
          {suggestedOptions.length > 0 ? (
            <section className="okr-bot-options-group" aria-label="Suggested matches">
              <span>Suggested matches</span>
              <div className="okr-bot-options">{suggestedOptions.map(renderOption)}</div>
            </section>
          ) : null}

          <section className="okr-bot-options-group" aria-label="All Key Results">
            {suggestedOptions.length > 0 ? <span>All Key Results</span> : null}
            <div className="okr-bot-options">{remainingOptions.map(renderOption)}</div>
          </section>
        </div>
      )}
    </div>
  );
}

function OkrBotCollapsibleUiResponse({
  disabled,
  isActive,
  onConfirmProposal,
  onDiscardProposal,
  onEditProposal,
  projectSourceRecordId,
  uiResponse
}: {
  disabled: boolean;
  isActive: boolean;
  onConfirmProposal?: () => void;
  onDiscardProposal?: () => void;
  onEditProposal?: () => void;
  projectSourceRecordId?: string;
  uiResponse: OkrBotUiResponse;
}) {
  const [isCollapsed, setIsCollapsed] = useState(uiResponse.collapsed ?? true);
  const cardDisabled = disabled || !isActive;

  return (
    <section className={`okr-bot-ui-response${isCollapsed ? " is-collapsed" : " is-expanded"}`}>
      <button
        aria-expanded={!isCollapsed}
        className="okr-bot-ui-response-toggle"
        onClick={() => setIsCollapsed((currentValue) => !currentValue)}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          {isCollapsed ? <path d="m9 6 6 6-6 6" /> : <path d="m6 9 6 6 6-6" />}
        </svg>
        <strong>{isCollapsed ? "UI contraída" : "UI expandida"}</strong>
        <span>{getUiResponseSummary(uiResponse)}</span>
      </button>

      {!isCollapsed && uiResponse.type === "proposal" ? (
        <OkrBotProposalCard
          disabled={cardDisabled}
          onConfirm={onConfirmProposal ?? (() => undefined)}
          onDiscard={onDiscardProposal ?? (() => undefined)}
          onEdit={onEditProposal ?? (() => undefined)}
          proposal={uiResponse.proposal}
          projectSourceRecordId={projectSourceRecordId}
        />
      ) : null}
    </section>
  );
}

export function OkrBotMessage({
  activeProposalMessageId,
  fallbackMessage,
  messages,
  onConfirmProposal,
  onDiscardProposal,
  onEditProposal,
  onSelectOption,
  options = [],
  optionsDisabled = false,
  optionsSuggestionQuery,
  optionsVariant = "default",
  projectSourceRecordId
}: OkrBotMessageProps) {
  const visibleMessages =
    messages.length > 0 ? messages : [{ id: "fallback", role: "assistant" as const, text: fallbackMessage }];
  const lastAssistantMessageId = [...visibleMessages].reverse().find((message) => message.role === "assistant")?.id;

  return (
    <header className="okr-bot-card-header">
      <div className="okr-bot-intro">
        {visibleMessages.map((message) => {
          const shouldShowOptions =
            message.id === lastAssistantMessageId && !message.isThinking && options.length > 0 && onSelectOption;

          return (
            <div
              className={`okr-bot-intro-message is-${message.role}${message.isThinking ? " is-thinking" : ""}`}
              key={message.id}
            >
              {message.role === "assistant" ? <OkrBotAvatar /> : null}
              <div className="okr-bot-intro-bubble">
                <span>{message.role === "assistant" ? "Chat OKRs Bot" : "You"}</span>
                {message.isThinking ? (
                  <p className="okr-bot-thinking-text">
                    {message.text || "Thinking"}
                    <span aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  </p>
                ) : message.role === "assistant" ? (
                  renderBotMarkdown(message.text)
                ) : (
                  <p>{message.text}</p>
                )}
                {message.uiResponse || message.proposal ? (
                  <OkrBotCollapsibleUiResponse
                    disabled={optionsDisabled}
                    isActive={message.id === activeProposalMessageId}
                    onConfirmProposal={onConfirmProposal}
                    onDiscardProposal={onDiscardProposal}
                    onEditProposal={onEditProposal}
                    projectSourceRecordId={projectSourceRecordId}
                    uiResponse={
                      message.uiResponse ?? {
                        collapsed: true,
                        proposal: message.proposal as OkrBotProposal,
                        type: "proposal"
                      }
                    }
                  />
                ) : null}
                {shouldShowOptions ? (
                  <OkrBotSelectableOptions
                    disabled={optionsDisabled}
                    onSelectOption={onSelectOption}
                    options={options}
                    suggestionQuery={optionsSuggestionQuery}
                    variant={optionsVariant}
                  />
                ) : null}
              </div>
              <small>{message.role === "assistant" ? "OKR Bot" : "You"} · Just now</small>
            </div>
          );
        })}
      </div>
    </header>
  );
}
