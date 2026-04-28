"use client";

import { useEffect, useId, useState } from "react";

export function ConfidenceHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        aria-label="Open confidence definition"
        className="confidence-trigger"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        ℹ️
      </button>

      {isOpen ? (
        <div
          aria-labelledby={titleId}
          aria-modal="true"
          className="confidence-modal"
          role="dialog"
        >
          <button
            aria-label="Close confidence definition"
            className="confidence-backdrop"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <div className="confidence-panel">
            <div className="confidence-panel-header">
              <strong id={titleId}>Confidence definition</strong>
              <button
                className="confidence-close"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>
            <dl>
              <dt>high</dt>
              <dd>
                The model considers the Latin output straightforward and usable as-is,
                with no Japanese characters and room/unit info preserved.
              </dd>
              <dt>medium</dt>
              <dd>
                Usable-looking output, but the model had some uncertainty, usually
                because the building name could have multiple readings or styles.
              </dd>
              <dt>low</dt>
              <dd>
                Risky output, often because Japanese remains, the reading is unclear,
                or the model could not confidently preserve the building identity.
              </dd>
            </dl>
          </div>
        </div>
      ) : null}
    </>
  );
}
