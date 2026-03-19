# Phase 9 Summary

## What Was Introduced

Phase 9 introduced an explicit target abstraction layer centered on `target_bundle`.

The new abstraction covers:

- window matcher
- focus strategy
- control strategy
- readback strategy
- default OCR profile
- optional ROI presets and target-level OCR overrides

## What Duplication Was Reduced

Reduced duplication:

- shared Notepad control/focus/readback behavior is now declared once and inherited by the secondary Notepad target
- 7-Zip now reuses a shared OCR base profile and narrows it through target-level overrides instead of duplicating a fully separate embedded profile everywhere
- focus and readback behavior is now explicit in config instead of being implicit inside scripts only
- validation logs now carry target bundle, focus strategy, and readback strategy metadata

## What Remains Application-Specific

Still application-specific:

- window title patterns
- process identity
- control class and control name
- whether direct focus works or activation is required first
- exact ROI placement and OCR scaling
- control-specific write/readback behavior

The abstraction is therefore honest: it reduces duplication and clarifies intent, but it does not claim that validated targets are interchangeable.

## Validation Result

The refactored abstractions still worked for both validated applications:

- Notepad
- 7-Zip File Manager

Representative evidence:

- `examples/logs/phase9-notepad-target-abstraction-validation.json`
- `examples/logs/phase9-7zip-target-abstraction-validation.json`

## Future Designer Readiness

The project is now better prepared for a future visual target designer.

Why:

- matcher, control, focus, readback, and OCR defaults are now separate explicit objects
- the runtime already normalizes inherited target bundles
- target-level ROI presets are now addressable by name
- the read-only frontend can surface the abstraction without adding editing or execution controls

What is still needed before a visual target designer would be credible:

- stronger target-bundle cataloging beyond individual config files
- more validation across additional application classes
- clearer constraints around which control types support which safe actions reliably
