# Iconic - Creative Icon Generator — Bot specification

**Archetype:** content

**Voice:** professional and encouraging — write every user-facing message, button label, error, and empty state in this voice.

A Telegram bot that generates five creative icon images with matching captions from user prompts, helping designers explore visual concepts and micro-copy for UI, marketing, and branding.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- Product designers
- UI/UX designers
- Graphic designers
- Content creators
- Small design teams

## Success criteria

- Delivers 5 icon+caption variations per prompt with download/save functionality
- Maintains user history with thumbnails and captions
- Enforces freemium generation quotas with paid subscription upgrades

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Display welcome message with example prompts and instructions
- **Generate Icons** (button, actor: user, callback: generate:start) — Trigger icon generation workflow
  - inputs: text prompt
  - outputs: 5 icon variations with captions
- **/history** (command, actor: user, command: /history) — Show saved icon history with re-download options
- **Feedback** (button, actor: user, callback: feedback:submit) — Provide thumbs-up/down feedback on generated variations

## Flows

### Initial Setup
_Trigger:_ /start

1. Display welcome message
2. Show example prompts
3. Offer first generation option

_Data touched:_ User

### Icon Generation
_Trigger:_ text prompt

1. Receive user prompt
2. Generate 5 icon variations
3. Display thumbnails with captions
4. Add download/save buttons

_Data touched:_ Prompt, Variation

### History Management
_Trigger:_ /history

1. List saved variations
2. Show download/regenerate options
3. Allow history deletion

_Data touched:_ Session/History

### Feedback Collection
_Trigger:_ thumbs up/down buttons

1. Record user feedback
2. Store with variation metadata

_Data touched:_ Feedback

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram user with generation quota and preferences
  - fields: Telegram ID, Generation quota, Subscription status
- **Prompt** _(retention: persistent)_ — User-provided text for icon generation
  - fields: Text content, Timestamp, Tone description
- **Variation** _(retention: persistent)_ — Generated icon+caption pair
  - fields: Thumbnail URL, High-res file URL, Caption text, Feedback score
- **Session/History** _(retention: persistent)_ — Saved user interactions
  - fields: Prompt text, Variation selection, Timestamp
- **Feedback** _(retention: persistent)_ — User quality ratings
  - fields: Telegram ID, Variation ID, Rating (👍/👎)

## Integrations

- **Telegram** (required) — Bot API messaging and file delivery
- **Telegram Payments** (required) — In-chat subscription billing
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Admin notifications for payments/errors
- Quota limits configuration
- File retention policies
- Subscription pricing settings

## Notifications

- Admin alerts for new paid subscriptions
- Error notifications for generation failures
- Quota limit warnings for users

## Permissions & privacy

- User data stored with 90-day retention
- /clear_history command for deletion
- Minimal data collection (no source prompts stored beyond history)

## Edge cases

- Exceeding free tier quota
- Invalid/censored prompts
- File delivery failures
- Concurrent generation requests
- Missing user history entries

## Required tests

- End-to-end generation workflow test
- History persistence test
- Quota enforcement test
- Feedback collection validation
- Error recovery scenarios

## Assumptions

- PNG is preferred over SVG for universal compatibility
- 3 free generations/day is acceptable baseline
- Single admin account for notifications is sufficient
