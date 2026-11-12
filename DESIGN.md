# PlanTravel interface

The product is a Vietnamese travel planning tool. Its task screens prioritize readable itineraries, maps, expenses and reliable actions. The dashboard adds photographic inspiration without inventing trip data.

- Preserve the existing Source Sans Pro typeface, deep pine `#14342B`, white panels and burnt orange action color `#B94E28`. Use the quiet green canvas `#F3F6F3` and borders `#DDE5DE`.
- Use orange for primary actions, green for navigation and selected states. Keep secondary actions neutral. Avoid decorative gradients; a scrim over destination photography is appropriate for readable text.
- Dashboard: a split photographic opening, compact real trip statistics and destination photographs. Empty and populated states use the same hierarchy.
- Trip setup: contextual introduction and photograph next to the form on desktop; a single column on smaller screens. Maps keep controls outside the canvas.
- Use existing local destination photographs and preserve their image credits. Inspiration photography must be labeled as a destination, never as a user's saved trip.
- Motion: one bounded photo reveal on the dashboard; fast feedback for controls; 180ms disclosure transitions. Respect `prefers-reduced-motion`, keep content usable without animation, and avoid continuous decorative effects.
- Maintain visible keyboard focus, readable contrast, native form affordances and no horizontal page overflow at 390px.
