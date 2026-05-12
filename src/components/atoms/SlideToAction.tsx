import { useRef } from "react";

interface SlideToActionProps {
  label: string;
  onSlide: () => void;
  disabled?: boolean;
}

export default function SlideToAction({ label, onSlide, disabled = false }: SlideToActionProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const offsetX = useRef(0);
  const endX = useRef(0);

  const stopDragging = () => {
    isDragging.current = false;
    document.body.classList.remove("cursor-grabbing");
    document.body.removeEventListener("pointermove", handlePointerMove);
    document.body.removeEventListener("pointerup", handlePointerUp);
    if (!knobRef.current || !bannerRef.current) return;
    knobRef.current.style.transform = "translateX(0)";
    knobRef.current.style.transition = "0.3s";
    bannerRef.current.style.width = "0";
  };

  const startDragging = (x: number) => {
    if (!knobRef.current || !knobRef.current.parentElement) return;
    offsetX.current = x;
    endX.current =
      knobRef.current.parentElement.getBoundingClientRect().width -
      knobRef.current.getBoundingClientRect().width / 1.2;
    isDragging.current = true;
    document.body.addEventListener("pointermove", handlePointerMove);
    document.body.addEventListener("pointerup", handlePointerUp);
    document.body.classList.add("cursor-grabbing");
  };

  const handleConfirm = () => {
    stopDragging();
    onSlide();
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging.current || !knobRef.current || !bannerRef.current) return;
    const x = e.clientX;
    const transformX = Math.max(0, Math.min(endX.current, x - offsetX.current));
    const knobWidth = knobRef.current.getBoundingClientRect().width;
    knobRef.current.style.transition = "none";
    knobRef.current.style.transform = `translateX(${transformX}px)`;
    bannerRef.current.style.transition = "none";
    bannerRef.current.style.width = `${transformX + knobWidth}px`;
    if (transformX >= endX.current) handleConfirm();
  };

  const handlePointerUp = () => stopDragging();

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    startDragging(e.clientX);
  };

  return (
    <div
      className={`border border-primary rounded-full h-12 flex items-center relative overflow-hidden ${
        disabled ? "opacity-40 pointer-events-none" : ""
      }`}
      style={{ touchAction: "none" }}
    >
      <div ref={bannerRef} className="h-full w-0 bg-primary/40 absolute rounded-full" />
      <div
        ref={knobRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="h-12 w-12 relative z-10 flex items-center justify-center bg-primary rounded-full cursor-grab active:cursor-grabbing shrink-0"
        style={{ touchAction: "none" }}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
      <div className="text-sm font-semibold text-primary flex-1 text-center select-none">
        {label}
      </div>
    </div>
  );
}
