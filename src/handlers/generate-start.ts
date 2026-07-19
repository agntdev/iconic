import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  inlineButton,
  inlineKeyboard,
} from "../toolkit/index.js";
import {
  canGenerate,
  recordGeneration,
  type GenerationData,
} from "../store.js";

const STYLES = [
  "Geometric",
  "Minimal",
  "Bold",
  "Gradient",
  "Abstract",
];

function hashPrompt(prompt: string): number {
  let h = 0;
  for (let i = 0; i < prompt.length; i++) {
    h = ((h << 5) - h + prompt.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const BLOCKS = ["█", "▓", "▒", "░", "▪", "▫", "■", "□", "◆", "◇", "●", "○", "◉", "◎", "★", "☆"];

function generateIconLines(prompt: string, styleIdx: number, seed: number): string[] {
  const lines: string[] = [];
  const s = seed + styleIdx * 7919;
  const rows = 5;
  const cols = 5;
  for (let r = 0; r < rows; r++) {
    let row = "";
    for (let c = 0; c < cols; c++) {
      const idx = (s + r * 31 + c * 17 + styleIdx * 53) % BLOCKS.length;
      row += BLOCKS[idx];
    }
    lines.push(row);
  }
  return lines;
}

function generateCaption(prompt: string, styleIdx: number): string {
  const style = STYLES[styleIdx % STYLES.length];
  return `${style} interpretation of "${prompt}"`;
}

function variationId(genId: string, idx: number): string {
  return `${genId}:v${idx}`;
}

const composer = new Composer<Ctx>();

composer.callbackQuery("generate:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id ?? 0;
  const allowed = await canGenerate(userId);
  if (!allowed) {
    await ctx.reply(
      "You've used all 3 free generations for today. Upgrade to Pro for unlimited icons!",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("⭐ Upgrade to Pro", "upgrade:start")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }
  ctx.session.step = "awaiting_prompt";
  await ctx.reply(
    "What kind of icon would you like? Describe it in a few words.",
    {
      reply_markup: {
        force_reply: true,
        input_field_placeholder: "e.g. mountain sunrise logo…",
      },
    },
  );
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_prompt") return next();

  const prompt = ctx.message.text.trim();
  if (prompt.length < 2) {
    await ctx.reply("Try a slightly longer description — at least a couple of words.");
    return;
  }

  const userId = ctx.from?.id ?? 0;
  const allowed = await canGenerate(userId);
  if (!allowed) {
    ctx.session.step = "idle";
    await ctx.reply(
      "You've used all 3 free generations for today. Upgrade to Pro for unlimited icons!",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("⭐ Upgrade to Pro", "upgrade:start")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }

  ctx.session.step = "idle";
  await ctx.replyWithChatAction("typing");

  const seed = hashPrompt(prompt);
  const genId = `gen_${Date.now()}_${seed}`;
  const variationIds: string[] = [];

  const variations = STYLES.map((style, i) => {
    const vid = variationId(genId, i);
    variationIds.push(vid);
    return {
      id: vid,
      caption: generateCaption(prompt, i),
      iconLines: generateIconLines(prompt, i, seed),
    };
  });

  const gen: GenerationData = {
    id: genId,
    userId,
    prompt,
    timestamp: Date.now(),
    variations,
  };
  await recordGeneration(userId, gen);

  ctx.session.pendingVariationIds = variationIds;
  ctx.session.lastGenerationId = genId;

  const iconBlock = variations
    .map((v, i) => `*${i + 1}. ${v.caption}*\n${v.iconLines.join("\n")}`)
    .join("\n\n");

  await ctx.reply(iconBlock, {
    parse_mode: "Markdown",
    reply_markup: inlineKeyboard([
      [
        inlineButton("👍 Like", `feedback:up:${genId}:0`),
        inlineButton("👎 Dislike", `feedback:down:${genId}:0`),
      ],
      [
        inlineButton("📜 History", "history:show"),
        inlineButton("⬅️ Back to menu", "menu:main"),
      ],
    ]),
  });
});

export default composer;
