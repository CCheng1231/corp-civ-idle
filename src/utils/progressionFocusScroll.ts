type ScrollAlign = "center" | "start" | "comfortable";

function findTabScrollContainer(from: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = from;
  while (node) {
    if (node.classList.contains("location-view-body")) {
      return node;
    }
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function isMeasurableInLayout(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  return rect.height > 10 && rect.width > 10;
}

export function scrollProgressionCardIntoView(
  element: HTMLElement,
  options?: { behavior?: ScrollBehavior; align?: ScrollAlign },
): void {
  const behavior = options?.behavior ?? "smooth";
  const align = options?.align ?? "comfortable";
  const scrollParent = findTabScrollContainer(element);

  if (!scrollParent) {
    element.scrollIntoView({ behavior, block: "center", inline: "nearest" });
    return;
  }

  const parentRect = scrollParent.getBoundingClientRect();
  const elRect = element.getBoundingClientRect();
  const viewHeight = parentRect.height;
  const deltaTop = elRect.top - parentRect.top;

  let targetTop: number;
  if (align === "center") {
    targetTop =
      scrollParent.scrollTop + deltaTop - (viewHeight - elRect.height) / 2;
  } else if (align === "start") {
    targetTop = scrollParent.scrollTop + deltaTop - 12;
  } else {
    const offset = Math.min(viewHeight * 0.34, viewHeight - elRect.height - 20);
    targetTop = scrollParent.scrollTop + deltaTop - Math.max(12, offset);
  }

  const maxScroll = scrollParent.scrollHeight - scrollParent.clientHeight;
  scrollParent.scrollTo({
    top: Math.max(0, Math.min(maxScroll, targetTop)),
    behavior,
  });
}

/** Retry until the target card is laid out (e.g. category `<details>` opened). */
export function scrollProgressionCardIntoViewWhenReady(
  elementId: string,
  options?: { behavior?: ScrollBehavior; align?: ScrollAlign },
): () => void {
  let cancelled = false;
  let attempts = 0;
  const maxAttempts = 16;

  const tryScroll = () => {
    if (cancelled) return;
    const el = document.getElementById(elementId);
    if (el && isMeasurableInLayout(el)) {
      scrollProgressionCardIntoView(el, options);
      return;
    }
    attempts += 1;
    if (attempts < maxAttempts) {
      window.setTimeout(tryScroll, 50);
    }
  };

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(tryScroll);
  });

  return () => {
    cancelled = true;
  };
}
