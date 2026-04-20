"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TrustworthinessWorkspace } from "@/components/trustworthiness-workspace";
import type { WalkthroughVariant } from "@/components/trustworthiness-workspace/types";
import { WorkspaceSettings } from "@/components/workspace-settings";

type WorkspaceShellContentProps = {
  userInitial: string;
  userLabel: string;
  userRole: string;
};

type WalkthroughStep = {
  autoOpenPanel?: "agent" | "context" | "save_confirmation";
  body: string;
  enterAction?: "open_chatbot";
  id: string;
  selector: string;
  targetPanel?: "chat" | "chat_agent" | "chat_context" | "chat_save_confirmation" | "workspace";
  title: string;
  waitFor?: "chat_context" | "chat_shell" | "chat_step";
};

const MANUAL_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "overview",
    selector: '[data-walkthrough="workspace-overview"]',
    title: "TW Monthly",
    body:
      "Esta vista centraliza las evaluaciones mensuales de Trustworthiness. Desde aquí revisas qué evaluaciones siguen pendientes, entras al detalle y completas la calificación manual."
  },
  {
    id: "filters",
    selector: '[data-walkthrough="workspace-filters"]',
    title: "Filtros principales",
    body:
      "Usa Periodos para definir la ventana mensual que estás auditando y Status para ver solo las evaluaciones en el estado que necesitas trabajar. La tabla se actualiza con esos filtros."
  },
  {
    id: "table",
    selector: '[data-walkthrough="workspace-period-table"]',
    title: "Tabla de evaluaciones",
    body:
      "Cada fila corresponde a una evaluación. Aquí ves rápidamente la persona evaluada, el contexto, el rol, el score actual, fortalezas, debilidades, estado y última actualización."
  },
  {
    id: "detail-entry",
    selector: '[data-walkthrough="workspace-period-table"]',
    title: "Abrir detalle",
    body:
      "Haz clic en una fila para abrir el detalle de la evaluación. Ese panel lateral es el espacio principal para revisar evidencia, ajustar el estado y editar la calificación manual."
  },
  {
    id: "detail-snapshot",
    selector: '[data-walkthrough="detail-snapshot"]',
    title: "Snapshot de evaluación",
    body:
      "En la parte superior del detalle tienes el resumen rápido: Trustworthiness, estado, período y fecha de actualización. Este bloque te da contexto antes de tocar la evaluación."
  },
  {
    id: "detail-status",
    selector: '[data-walkthrough="detail-status"]',
    title: "Estado de la evaluación",
    body:
      "Aquí eliges el estado objetivo entre Pending y Done, pero el cambio no se guarda solo. La confirmación final manda: puedes cerrar como Draft o como Done cuando termines."
  },
  {
    id: "detail-summary",
    selector: '[data-walkthrough="detail-summary"]',
    title: "Resumen y contexto",
    body:
      "Los bloques de resumen te ayudan a entender la lectura general del registro: fortalezas, debilidades, personas relacionadas y contexto evaluado. Úsalos como referencia antes de ajustar puntajes."
  },
  {
    id: "detail-meetings",
    selector: '[data-walkthrough="detail-meetings"]',
    title: "Detalle de reuniones",
    body:
      "Este bloque cruza las reuniones relacionadas con el talento dentro del período seleccionado. Aquí validas si existe evidencia suficiente para sostener o ajustar la evaluación."
  },
  {
    id: "detail-transcript",
    selector: '[data-walkthrough="detail-transcript"]',
    title: "Abrir transcript",
    body:
      "Si necesitas más detalle, abre un transcript desde una reunión relacionada. Eso te permite revisar la conversación original y confirmar si el puntaje y el feedback reflejan la evidencia."
  },
  {
    id: "detail-trustworthiness",
    selector: '[data-walkthrough="detail-trustworthiness"]',
    title: "Editar pilares",
    body:
      "En la sección Trustworthiness puedes ajustar manualmente los pilares: Reliability, Intimacy, Group Thinking y Credibility. Cambia las estrellas según tu criterio como evaluador."
  },
  {
    id: "detail-feedback",
    selector: '[data-walkthrough="detail-feedback"]',
    title: "Editar feedback",
    body:
      "Este bloque reúne la narrativa final de la evaluación: ves el campo Feedback completo, puedes editar el texto y también disparar Generar con IA para proponer una nueva redacción alineada con los puntajes."
  },
  {
    id: "detail-save",
    selector: '[data-walkthrough="detail-save"]',
    title: "Guardar cambios",
    body:
      "Cuando hay cambios pendientes aparece un único CTA para guardar la evaluación. Esa confirmación final te deja elegir Guardar como Draft, Guardar como Done o Discard para salir sin persistir nada."
  }
];

const CHATBOT_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    body:
      "Este botón inicia el flujo demo del chatbot de revisión. El sistema prepara una sugerencia TW simulada, monta reuniones demo y luego abre el chat.",
    enterAction: "open_chatbot",
    id: "chatbot-entry",
    selector: '[data-walkthrough="chatbot-entry"]',
    targetPanel: "workspace",
    title: "Abrir chat desde la tabla"
  },
  {
    body:
      "Apenas empieza el WT Chatbot, se abre el chat de revisión con una propuesta demo y contexto simulado, sin esperar generación ni cruces reales.",
    id: "chatbot-shell",
    selector: '[data-walkthrough="chatbot-shell-header"]',
    targetPanel: "chat",
    title: "Chat listo con TW generado",
    waitFor: "chat_shell"
  },
  {
    body:
      "Aquí ves la propuesta activa: score sugerido, estado de la propuesta, pilares editables y feedback base con el que conversará el asistente.",
    id: "chatbot-proposal",
    selector: '[data-walkthrough="chatbot-proposal-card"]',
    targetPanel: "chat",
    title: "Propuesta activa",
    waitFor: "chat_step"
  },
  {
    body:
      "Este mensaje demuestra cómo el chatbot explica el resultado con base en la evidencia disponible, citando reuniones y destacando señales que suben o bajan el score.",
    id: "chatbot-explanation",
    selector: '[data-walkthrough="chatbot-explanation-bubble"]',
    targetPanel: "chat",
    title: "Explicación basada en evidencia",
    waitFor: "chat_step"
  },
  {
    body:
      "Las acciones rápidas aceleran la revisión: puedes preparar guardado o enfocarte en un pilar específico o en el feedback general.",
    id: "chatbot-quick-actions",
    selector: '[data-walkthrough="chatbot-quick-actions"]',
    targetPanel: "chat",
    title: "Acciones rápidas del chat",
    waitFor: "chat_step"
  },
  {
    body:
      "Este composer es el punto de entrada para conversar con el asistente. En el walkthrough se muestra como demo guiada, sin enviar prompts reales.",
    id: "chatbot-composer",
    selector: '[data-walkthrough="chatbot-composer"]',
    targetPanel: "chat",
    title: "Pregunta o ajuste",
    waitFor: "chat_step"
  },
  {
    autoOpenPanel: "context",
    body:
      "Desde este acceso se abre el panel de contexto del chat, donde se resume qué información alimenta al asistente antes de conversar o guardar.",
    id: "chatbot-context-trigger",
    selector: '[data-walkthrough="chatbot-context-trigger"]',
    targetPanel: "chat",
    title: "Abrir contexto del chat",
    waitFor: "chat_step"
  },
  {
    body:
      "Este panel muestra la base del contexto: talento, proyecto, período oficial y la salida de Generate TW que se convirtió en la propuesta del chat.",
    id: "chatbot-context-panel",
    selector: '[data-walkthrough="chatbot-context-panel"]',
    targetPanel: "chat_context",
    title: "Base del contexto y salida de Generate TW",
    waitFor: "chat_context"
  },
  {
    body:
      "Aquí se listan las reuniones relacionadas dentro del período seleccionado. Desde este punto también puedes abrir transcript para profundizar la evidencia.",
    id: "chatbot-context-meetings",
    selector: '[data-walkthrough="chatbot-context-meetings"]',
    targetPanel: "chat_context",
    title: "Detalle de reuniones y transcript",
    waitFor: "chat_context"
  },
  {
    autoOpenPanel: "agent",
    body:
      "Este panel deja visible la configuración del agente: modelo, objetivos, guardrails y acciones soportadas por el Asistente de Revisión TW.",
    id: "chatbot-agent-panel",
    selector: '[data-walkthrough="chatbot-agent-panel"]',
    targetPanel: "chat_agent",
    title: "Configuración del agente",
    waitFor: "chat_step"
  },
  {
    body:
      "Cuando la propuesta ya fue revisada, este es el disparador para preparar el guardado desde el chat. En el walkthrough no persiste cambios reales.",
    id: "chatbot-save-trigger",
    selector: '[data-walkthrough="chatbot-save-trigger"]',
    targetPanel: "chat",
    title: "Preparar guardado",
    waitFor: "chat_step"
  },
  {
    autoOpenPanel: "save_confirmation",
    body:
      "Este es el último paso del flujo: la confirmación final antes de guardar. Aquí eliges Draft, Done o Discard. En WT Chatbot llegamos hasta aquí en modo seguro, sin ejecutar el save real.",
    id: "chatbot-save-confirmation",
    selector: '[data-walkthrough="chatbot-save-confirmation"]',
    targetPanel: "chat_save_confirmation",
    title: "Confirmación final",
    waitFor: "chat_step"
  }
];

const WALKTHROUGH_DEFINITIONS: Record<WalkthroughVariant, WalkthroughStep[]> = {
  chatbot: CHATBOT_WALKTHROUGH_STEPS,
  manual: MANUAL_WALKTHROUGH_STEPS
};

type HighlightRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export function WorkspaceShellContent({
  userInitial,
  userLabel,
  userRole
}: WorkspaceShellContentProps) {
  const walkthroughMenuRef = useRef<HTMLDetailsElement>(null);
  const [activeWalkthroughVariant, setActiveWalkthroughVariant] =
    useState<WalkthroughVariant>("manual");
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [walkthroughToast, setWalkthroughToast] = useState<{
    id: number;
    message: string;
  } | null>(null);

  const activeSteps = WALKTHROUGH_DEFINITIONS[activeWalkthroughVariant];
  const activeStep =
    activeSteps[Math.min(activeStepIndex, Math.max(0, activeSteps.length - 1))] ?? activeSteps[0];
  const shouldPinWalkthroughPanelTop =
    typeof window !== "undefined" &&
    highlightRect !== null &&
    highlightRect.top + highlightRect.height / 2 > window.innerHeight * 0.54;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const detailsElement = walkthroughMenuRef.current;

      if (!detailsElement?.open) {
        return;
      }

      const target = event.target;

      if (target instanceof Node && !detailsElement.contains(target)) {
        detailsElement.open = false;
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!walkthroughToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setWalkthroughToast((current) =>
        current?.id === walkthroughToast.id ? null : current
      );
    }, 2600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [walkthroughToast]);

  useEffect(() => {
    if (!isWalkthroughOpen) {
      setHighlightRect(null);
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    let timeoutId = 0;
    let rafId = 0;
    let isActive = true;

    const updateHighlight = () => {
      if (!isActive) {
        return;
      }

      const target = document.querySelector<HTMLElement>(activeStep.selector);

      if (!target) {
        timeoutId = window.setTimeout(updateHighlight, activeStep.waitFor ? 140 : 90);
        return;
      }

      target.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest"
      });

      rafId = window.requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const inset = 14;
        const top = Math.max(10, rect.top - inset);
        const left = Math.max(10, rect.left - inset);
        const width = Math.min(rect.width + inset * 2, window.innerWidth - left - 10);
        const height = Math.min(rect.height + inset * 2, window.innerHeight - top - 10);

        setHighlightRect({
          top,
          left,
          width,
          height
        });
      });
    };

    updateHighlight();

    const handleViewportChange = () => {
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(rafId);
      updateHighlight();
    };

    window.addEventListener("resize", handleViewportChange);
    document.addEventListener("scroll", handleViewportChange, true);

    return () => {
      isActive = false;
      document.body.style.overflow = "";
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleViewportChange);
      document.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [activeStep, isWalkthroughOpen]);

  function openWalkthrough(variant: WalkthroughVariant) {
    if (walkthroughMenuRef.current) {
      walkthroughMenuRef.current.open = false;
    }
    setActiveWalkthroughVariant(variant);
    setActiveStepIndex(0);
    setIsWalkthroughOpen(true);
  }

  function closeWalkthrough() {
    setIsWalkthroughOpen(false);
    setActiveStepIndex(0);
  }

  function goToPreviousStep() {
    setActiveStepIndex((current) => Math.max(0, current - 1));
  }

  function goToNextStep() {
    setActiveStepIndex((current) => {
      if (current >= activeSteps.length - 1) {
        setIsWalkthroughOpen(false);
        return 0;
      }

      return current + 1;
    });
  }

  function handleOpenChatbotWalkthrough() {
    openWalkthrough("chatbot");
  }

  function handleWalkthroughAbort(message?: string) {
    closeWalkthrough();

    if (message) {
      setWalkthroughToast({
        id: Date.now(),
        message
      });
    }
  }

  function handleWalkthroughToast(message: string) {
    setWalkthroughToast({
      id: Date.now(),
      message
    });
  }

  return (
    <div className="workspace-shell-main">
      <header className="workspace-topbar">
        <div className="workspace-topbar-copy" data-walkthrough="workspace-overview">
          <span className="workspace-topbar-eyebrow">Workspace</span>
          <div className="workspace-topbar-heading">
            <h1>Monthly Trustworthiness</h1>
            <p>Singular Platform</p>
          </div>
        </div>

        <div className="workspace-topbar-actions">
          <details className="workspace-topbar-walkthrough-menu" ref={walkthroughMenuRef}>
            <summary
              aria-label="Opciones de walkthrough de TW Monthly"
              className="workspace-topbar-info workspace-topbar-info-button"
            >
              <svg viewBox="0 0 24 24">
                <path d="M12 2.75A9.25 9.25 0 1 0 21.25 12 9.26 9.26 0 0 0 12 2.75Zm0 1.5A7.75 7.75 0 1 1 4.25 12 7.76 7.76 0 0 1 12 4.25Zm0 3a1.06 1.06 0 1 0 0 2.12 1.06 1.06 0 0 0 0-2.12Zm-1 4.13a.75.75 0 0 0 0 1.5h.25v3.87H11a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5h-.25v-4.62a.75.75 0 0 0-.75-.75Z" />
              </svg>
            </summary>
            <div className="workspace-topbar-walkthrough-panel">
              <button
                className="workspace-topbar-walkthrough-option"
                onClick={() => openWalkthrough("manual")}
                type="button"
              >
                <strong>WT Manual</strong>
                <span>Recorre el flujo actual completo de TW Monthly.</span>
              </button>
              <button
                className="workspace-topbar-walkthrough-option"
                onClick={handleOpenChatbotWalkthrough}
                type="button"
              >
                <strong>WT Chatbot</strong>
                <span>Recorre el flujo conversacional con Generate TW, reuniones y respuestas demo.</span>
              </button>
            </div>
          </details>
          <WorkspaceSettings
            userInitial={userInitial}
            userLabel={userLabel}
            userRole={userRole}
            variant="header"
          />
        </div>
      </header>

      <section className="workspace-main">
        <TrustworthinessWorkspace
          isWalkthroughOpen={isWalkthroughOpen}
          onWalkthroughAbort={handleWalkthroughAbort}
          onWalkthroughComplete={closeWalkthrough}
          onWalkthroughToast={handleWalkthroughToast}
          walkthroughStepId={activeStep?.id ?? null}
          walkthroughVariant={isWalkthroughOpen ? activeWalkthroughVariant : null}
        />
      </section>

      {isWalkthroughOpen && typeof document !== "undefined"
        ? createPortal(
            <div aria-modal="true" className="workspace-walkthrough-layer" role="dialog">
              {highlightRect ? (
                <>
                  <div
                    className="workspace-walkthrough-scrim"
                    onClick={closeWalkthrough}
                    style={{
                      top: 0,
                      left: 0,
                      width: "100vw",
                      height: `${highlightRect.top}px`
                    }}
                  />
                  <div
                    className="workspace-walkthrough-scrim"
                    onClick={closeWalkthrough}
                    style={{
                      top: `${highlightRect.top}px`,
                      left: 0,
                      width: `${highlightRect.left}px`,
                      height: `${highlightRect.height}px`
                    }}
                  />
                  <div
                    className="workspace-walkthrough-scrim"
                    onClick={closeWalkthrough}
                    style={{
                      top: `${highlightRect.top}px`,
                      left: `${highlightRect.left + highlightRect.width}px`,
                      width: `${Math.max(0, window.innerWidth - (highlightRect.left + highlightRect.width))}px`,
                      height: `${highlightRect.height}px`
                    }}
                  />
                  <div
                    className="workspace-walkthrough-scrim"
                    onClick={closeWalkthrough}
                    style={{
                      top: `${highlightRect.top + highlightRect.height}px`,
                      left: 0,
                      width: "100vw",
                      height: `${Math.max(0, window.innerHeight - (highlightRect.top + highlightRect.height))}px`
                    }}
                  />
                </>
              ) : (
                <div className="workspace-walkthrough-backdrop" onClick={closeWalkthrough} />
              )}
              {highlightRect ? (
                <div
                  aria-hidden="true"
                  className="workspace-walkthrough-highlight"
                  style={{
                    top: `${highlightRect.top}px`,
                    left: `${highlightRect.left}px`,
                    width: `${highlightRect.width}px`,
                    height: `${highlightRect.height}px`
                  }}
                />
              ) : null}
              <div
                className={`workspace-walkthrough-panel ${shouldPinWalkthroughPanelTop ? "is-top" : "is-bottom"}`}
              >
                <div className="workspace-walkthrough-panel-head">
                  <div>
                    <span>Walkthrough</span>
                    <strong>
                      Paso {activeStepIndex + 1} de {activeSteps.length}
                    </strong>
                  </div>
                  <button
                    className="workspace-walkthrough-close"
                    onClick={closeWalkthrough}
                    type="button"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="workspace-walkthrough-progress">
                  <span
                    aria-hidden="true"
                    className="workspace-walkthrough-progress-bar"
                    style={{
                      width: `${((activeStepIndex + 1) / activeSteps.length) * 100}%`
                    }}
                  />
                </div>

                <div className="workspace-walkthrough-copy">
                  <h3>{activeStep.title}</h3>
                  <p>{activeStep.body}</p>
                </div>

                <div className="workspace-walkthrough-actions">
                  <button
                    className="secondary-button workspace-walkthrough-button"
                    disabled={activeStepIndex === 0}
                    onClick={goToPreviousStep}
                    type="button"
                  >
                    Anterior
                  </button>
                  <button
                    className="workspace-walkthrough-button"
                    onClick={goToNextStep}
                    type="button"
                  >
                    {activeStepIndex === activeSteps.length - 1 ? "Finalizar" : "Siguiente"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {walkthroughToast && typeof document !== "undefined"
        ? createPortal(
            <div className="workspace-topbar-toast" role="status">
              {walkthroughToast.message}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
