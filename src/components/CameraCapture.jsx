import { useCallback, useEffect, useId, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'flowbite-react';

/**
 * Live camera capture for the identity-verification selfie.
 *
 * The evidence flow used to ask for a "selfie holding your ID" through a plain
 * file picker, which on a phone means leaving the app, opening the camera roll
 * (which may be empty) and hoping the shot is right. This dialog takes the
 * photo where the person already is.
 *
 * Two things here are load-bearing and easy to break:
 *
 * 1. Stream lifecycle. A MediaStream keeps the device camera powered until every
 *    track is stopped, so a leaked stream leaves the camera light on after the
 *    dialog closes. Every path goes through one stopStream() helper: unmount,
 *    close, and the start of a retry.
 * 2. No literal copy. Every visible string arrives in `labels`, so the caller
 *    stays in charge of language and this file needs no i18n import.
 *
 * Colours come only from the named theme tokens (bg-elevated, text-navy,
 * text-muted, text-charcoal, bg-surface). Arbitrary `bg-[#...]` hexes are
 * deliberately avoided: src/styles.css remaps a fixed list of those strings to
 * dark surfaces with a substring match that also catches `hover:` variants, so
 * a pale hover tint written that way would paint at rest in dark mode.
 */

const PANEL_CLASS =
  'relative flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-xl bg-elevated p-5 text-navy shadow-lg focus:outline-none sm:p-6';
const VIDEO_CLASS =
  'aspect-[4/3] max-h-[52dvh] w-full bg-black object-cover';

// 'starting' and 'live' are healthy states. 'unsupported' and 'denied' render
// the fallback message plus a retry, because both are recoverable: a permission
// can be granted again, and an insecure origin can be re-tried over https.
const ERROR_STATES = new Set(['unsupported', 'denied']);

function CameraCapture({ open, onCapture, onClose, labels, facingMode = 'user' }) {
  // Several instances could exist in one tree, and aria-labelledby would then
  // point at whichever title the browser found first.
  const titleId = useId();
  const hintId = useId();
  const panelRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  // A click can land twice before React re-renders the disabled button, so the
  // in-flight guard is a ref rather than the state flag.
  const capturingRef = useRef(false);
  // Each start gets a number. A start that resolves after the dialog closed, or
  // after a retry replaced it, sees a stale number and drops its own stream
  // instead of leaving the camera on.
  const generationRef = useRef(0);
  const [status, setStatus] = useState('starting');
  const [capturing, setCapturing] = useState(false);

  const stopStream = useCallback(() => {
    const stream = streamRef.current;
    // Cleared before the tracks are stopped so a second call (cleanup racing a
    // retry) has nothing left to act on.
    streamRef.current = null;
    if (!stream) return;
    stream.getTracks().forEach((track) => track.stop());
    // Detaching the stopped stream stops the browser painting a frozen last
    // frame behind the dialog while the tracks shut down.
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Closing wipes the state so a reopen starts from "starting" instead of
  // flashing the previous error for a frame.
  useEffect(() => {
    if (open) return;
    setStatus('starting');
    setCapturing(false);
    capturingRef.current = false;
  }, [open]);

  const startCamera = useCallback(async () => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    // A retry must not inherit the previous stream: stopping it first is what
    // lets the same camera be requested again on iOS.
    stopStream();
    setStatus('starting');
    setCapturing(false);
    capturingRef.current = false;

    // Bound through the object: getUserMedia throws "Illegal invocation" when it
    // is called as a bare function.
    const getUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
    if (!getUserMedia) {
      // No mediaDevices at all usually means an insecure origin (plain http on a
      // LAN address) or a browser without the API.
      setStatus('unsupported');
      return;
    }

    try {
      const stream = await getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      if (generation !== generationRef.current) {
        // The permission prompt outlived the dialog, or a retry overtook it.
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus('live');
    } catch {
      // Rejects for a denied permission and for no camera device present. The
      // wording lives in `labels.denied`, which the caller writes to cover both,
      // and the retry re-asks.
      if (generation === generationRef.current) setStatus('denied');
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    if (!open) return undefined;
    startCamera();

    return () => {
      // Bumping the generation invalidates a start still waiting on the
      // permission prompt, so its stream stops the moment it arrives.
      generationRef.current += 1;
      stopStream();
    };
    // stopStream is a useCallback with no dependencies, so listing it here is
    // what the rule asks for and still leaves the effect running only on open.
  }, [open, startCamera, stopStream]);

  // Escape is bound only while the dialog is mounted, matching the other
  // dialogs in the app, so no listener lingers on the page.
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Focus moves into the panel while it is up, and returns to the control that
  // opened it afterwards, so a keyboard user lands back on the upload button
  // instead of at the top of the page.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    panelRef.current?.focus();

    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [open]);

  function handleCapture() {
    const video = videoRef.current;
    // videoWidth stays 0 until the first frame arrives, and drawing it would
    // produce a blank image that looks like a successful capture.
    if (capturingRef.current || status !== 'live' || !video?.videoWidth || !video?.videoHeight) return;

    capturingRef.current = true;
    setCapturing(true);

    // Offscreen on purpose: the canvas never enters the layout, and drawing at
    // the intrinsic size keeps the photo at the camera's resolution instead of
    // whatever the preview box happens to be.
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context || typeof canvas.toBlob !== 'function') {
      capturingRef.current = false;
      setCapturing(false);
      // Cannot encode a photo on this browser, so offer the same retry/cancel
      // path as a missing camera rather than a dead button.
      setStatus('unsupported');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      capturingRef.current = false;
      setCapturing(false);
      if (!blob) {
        // Encoding failed for a reason the person cannot act on differently
        // from a retry; leave the camera live so "Take photo" still works.
        console.warn('CameraCapture: the JPEG encoder returned no data for the captured frame.');
        return;
      }
      // The frame is drawn unmirrored: the preview is flipped so it feels like a
      // mirror, but a mirrored ID and face is not what a reviewer expects.
      onCapture(new File([blob], 'selfie.jpg', { type: 'image/jpeg' }));
      onClose();
    }, 'image/jpeg', 0.92);
  }

  function handleBackdropClick(event) {
    // A click inside the panel bubbles here too, so only a click that lands on
    // the backdrop itself dismisses.
    if (event.target === event.currentTarget) onClose();
  }

  if (!open) return null;

  const isError = ERROR_STATES.has(status);
  const message = status === 'unsupported' ? labels.unsupported : labels.denied;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={hintId}
        tabIndex={-1}
        className={PANEL_CLASS}
      >
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-bold text-navy">{labels.title}</h2>
          <p id={hintId} className="mt-1 text-sm leading-relaxed text-muted">{labels.hint}</p>
        </div>

        {isError ? (
          <p role="alert" className="rounded-xl bg-surface p-4 text-sm leading-relaxed text-charcoal">{message}</p>
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-black">
            {/* Mirrored only for the front camera: a selfie preview that moves
                the wrong way is disorienting, but the saved frame is not. */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`${VIDEO_CLASS}${facingMode === 'user' ? ' -scale-x-100' : ''}`}
            />
            {status === 'starting' && (
              <p role="status" className="absolute inset-0 grid place-items-center px-4 text-center text-sm font-semibold text-white">
                {labels.starting}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button type="button" color="light" onClick={onClose}>{labels.cancel}</Button>
          {isError ? (
            <Button type="button" onClick={startCamera}>{labels.retry}</Button>
          ) : (
            <Button
              type="button"
              onClick={handleCapture}
              disabled={status !== 'live' || capturing}
            >
              {labels.capture}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

CameraCapture.propTypes = {
  open: PropTypes.bool.isRequired,
  // Receives an image/jpeg File of the captured frame.
  onCapture: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  // All visible copy, so the caller owns the language.
  labels: PropTypes.shape({
    title: PropTypes.string.isRequired,
    hint: PropTypes.string.isRequired,
    starting: PropTypes.string.isRequired,
    capture: PropTypes.string.isRequired,
    cancel: PropTypes.string.isRequired,
    denied: PropTypes.string.isRequired,
    unsupported: PropTypes.string.isRequired,
    retry: PropTypes.string.isRequired,
  }).isRequired,
  facingMode: PropTypes.string,
};

export default CameraCapture;
