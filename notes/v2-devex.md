# V2 DevEx

Date: 2026-03-19

## Goals

- reduce manual console work for the next session
- make safe validation easier to run consistently
- remove release-quality inconsistencies in the frontend build flow

## Main Changes

- aligned the frontend build output with the production server path
- added `npm run repo:validate` as a single safe release-candidate validation command
- expanded the morning workflow around health and UX validation
- kept the existing read-only helper script for opening morning entrypoints

## Safe Commands

- `npm run evidence:index`
- `npm run docs:check`
- `npm run repo:health`
- `npm run repo:ux:check`
- `npm run repo:validate`

## Result

The repository now has a cleaner safe-check path for release-candidate maintenance without adding execution shortcuts to the frontend.
