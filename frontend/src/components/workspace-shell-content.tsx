"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TrustworthinessWorkspace } from "@/components/trustworthiness-workspace";
import { WorkspaceSettings } from "@/components/workspace-settings";

type WorkspaceShellContentProps = {
  userInitial: string;
  userLabel: string;
  userRole: string;
};

type WalkthroughStep = {
  body: string;
  id: string;
  selector: string;
  title: string;
};

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "overview",
    selector: '[data-walkthrough="workspace-overview"]',
    title: "TW Monthly",
    body:
      "Esta vista centraliza las evaluaciones mensuales de Trustworthiness. Desde aqui filtras periodos, revisas el estado operativo y entras al detalle de cada evaluacion."
  },
  {
    id: "filters",
    selector: '[data-walkthrough="workspace-filters"]',
    title: "Filtros principales",
    body:
      "Periodos define la ventana mensual que consultas y Status recorta las evaluaciones visibles por estado. Cada cambio refresca la tabla inferior."
  },
  {
    id: "table",
    selector: '[data-walkthrough="workspace-period-table"]',
    title: "Como leer la tabla",
    body:
      "Cada fila es una evaluacion. Leela de izquierda a derecha: persona, contexto, rol, score de Trustworthiness, fortaleza, debilidad, estado, periodo y fecha de actualizacion."
  },
  {
    id: "detail-entry",
    selector: '[data-walkthrough="workspace-period-table"]',
    title: "Como entrar al detalle",
    body:
      "Para abrir una evaluacion, haz clic sobre cualquier fila. El sistema abre el panel lateral con el registro completo y sus acciones."
  },
  {
    id: "detail-actions",
    selector: '[data-walkthrough="detail-actions"]',
    title: "Acciones del detalle",
    body:
      "En la cabecera del detalle tienes tres acciones: generar sugerencia TW, abrir el chatbot de apoyo y cerrar el panel actual."
  },
  {
    id: "detail-sections",
    selector: '[data-walkthrough="detail-groups"]',
    title: "Secciones del detalle",
    body:
      "El detalle esta organizado por bloques. Arriba ves el snapshot rapido y debajo las secciones Resumen, Personas, Trustworthiness y Narrativa, cada una agrupando campos del registro."
  },
  {
    id: "detail-meetings",
    selector: '[data-walkthrough="detail-meetings"]',
    title: "Evidencia de reuniones",
    body:
      "Detalle de reuniones cruza las sesiones relacionadas con el talento. Desde aqui puedes abrir transcripts y validar la evidencia que alimenta la evaluacion."
  }
];

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
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);

  const activeStep = WALKTHROUGH_STEPS[activeStepIndex];

  useEffect(() => {
    if (!isWalkthroughOpen) {
      setHighlightRect(null);
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    let timeoutId = 0;
    let rafId = 0;
    let attempts = 0;

    const updateHighlight = () => {
      const target = document.querySelector<HTMLElement>(activeStep.selector);

      if (!target) {
        if (attempts < 12) {
          attempts += 1;
          timeoutId = window.setTimeout(updateHighlight, 80);
        } else {
          setHighlightRect(null);
        }

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
      attempts = 0;
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(rafId);
      updateHighlight();
    };

    window.addEventListener("resize", handleViewportChange);
    document.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.body.style.overflow = "";
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleViewportChange);
      document.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [activeStep, isWalkthroughOpen]);

  function openWalkthrough() {
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
      if (current >= WALKTHROUGH_STEPS.length - 1) {
        setIsWalkthroughOpen(false);
        return 0;
      }

      return current + 1;
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
          <button
            aria-label="Abrir walkthrough de TW Monthly"
            className="workspace-topbar-info workspace-topbar-info-button"
            data-tooltip="Abrir walkthrough de TW Monthly"
            onClick={openWalkthrough}
            type="button"
          >
            <svg viewBox="0 0 24 24">
              <path d="M12 2.75A9.25 9.25 0 1 0 21.25 12 9.26 9.26 0 0 0 12 2.75Zm0 1.5A7.75 7.75 0 1 1 4.25 12 7.76 7.76 0 0 1 12 4.25Zm0 3a1.06 1.06 0 1 0 0 2.12 1.06 1.06 0 0 0 0-2.12Zm-1 4.13a.75.75 0 0 0 0 1.5h.25v3.87H11a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5h-.25v-4.62a.75.75 0 0 0-.75-.75Z" />
            </svg>
          </button>
          <div className="workspace-topbar-pill">
            <span className="workspace-topbar-pill-dot" aria-hidden="true" />
            <span>Active View</span>
          </div>
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
          walkthroughStepId={activeStep?.id ?? null}
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
              <div className="workspace-walkthrough-panel">
                <div className="workspace-walkthrough-panel-head">
                  <div>
                    <span>Walkthrough</span>
                    <strong>
                      Paso {activeStepIndex + 1} de {WALKTHROUGH_STEPS.length}
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
                      width: `${((activeStepIndex + 1) / WALKTHROUGH_STEPS.length) * 100}%`
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
                    {activeStepIndex === WALKTHROUGH_STEPS.length - 1 ? "Finalizar" : "Siguiente"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
