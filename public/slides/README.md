# Home carousel images

Drop the slideshow images here, then point `lib/home-slides.ts` at them.

- Filenames must match the `image` values in `lib/home-slides.ts`
  (`slide-1.jpg`, `slide-2.jpg`, `slide-3.jpg` by default).
- Landscape, roughly 1920×720 or wider. They are rendered with
  `object-fit: cover`, so anything important should sit near the centre —
  the edges get cropped on narrow screens.
- Keep them under ~300 KB each if you can; they load on the first paint of
  the busiest page on the site.
