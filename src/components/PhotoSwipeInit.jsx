import { useEffect } from "react";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";

// Outward arrows enter fullscreen; inward arrows return to the window.
const fullscreenIcon = (active) => `
  <svg class="pswp__icn" viewBox="0 0 32 32" width="32" height="32"
    aria-hidden="true" focusable="false" style="fill:none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="5" y="5" width="22" height="22" rx="3" />
    <path d="${active
      ? "M10 22l5-5m-5 0h5v5M22 10l-5 5m0-5v5h5"
      : "M15 17l-5 5m0-5v5h5M17 15l5-5m-5 0h5v5"}" />
  </svg>`;

export default function PhotoSwipeInit({ galleryId, enableFullscreen = true }) {
  useEffect(() => {
    const lightbox = new PhotoSwipeLightbox({
      gallery: `#${galleryId}`,
      children: "a",
      pswpModule: () => import("photoswipe"),
    });

    if (enableFullscreen && document.fullscreenEnabled) {
      lightbox.on("uiRegister", () => {
        const pswp = lightbox.pswp;
        let closing = false;
        const exitFullscreen = () => {
          if (document.fullscreenElement === pswp.element) {
            return document.exitFullscreen();
          }
        };

        pswp.ui.registerElement({
          name: "fullscreen",
          order: 15,
          isButton: true,
          title: "Enter full screen",
          html: fullscreenIcon(false),
          onInit: (button) => {
            const update = () => {
              const active = document.fullscreenElement === pswp.element;
              button.innerHTML = fullscreenIcon(active);
              button.title = active ? "Exit full screen" : "Enter full screen";
              button.setAttribute("aria-label", button.title);
              button.setAttribute("aria-pressed", String(active));
              if (!closing) pswp.updateSize(true);
            };
            update();
            document.addEventListener("fullscreenchange", update);
            pswp.on("close", () => {
              closing = true;
              exitFullscreen()?.catch(() => {});
            });
            pswp.on("destroy", () => {
              document.removeEventListener("fullscreenchange", update);
            });
          },
          onClick: async (_event, button) => {
            try {
              if (document.fullscreenElement === pswp.element) {
                await document.exitFullscreen();
              } else {
                await pswp.element.requestFullscreen();
                // A close during the browser's request must not leave fullscreen open.
                if (closing) await exitFullscreen();
              }
            } catch {

              button.title = "Your browser could not switch to full screen";
              button.setAttribute("aria-label", button.title);
            }
          },
        });
      });
    }

    lightbox.init();
    return () => lightbox.destroy();
  }, [galleryId, enableFullscreen]);

  return null;
}
