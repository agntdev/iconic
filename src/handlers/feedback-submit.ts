import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  inlineButton,
  inlineKeyboard,
} from "../toolkit/index.js";
import { recordFeedback, getUserGenerations } from "../store.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("feedback:submit", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id ?? 0;
  const gens = await getUserGenerations(userId);

  if (gens.length === 0) {
    await ctx.reply(
      "No icons to rate yet — tap 🎨 Generate to create some first!",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("🎨 Generate", "generate:start")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }

  const latest = gens[0];
  const lines = latest.variations.map(
    (v, i) => `*${i + 1}. ${v.caption}*\n${v.iconLines.join("\n")}`,
  );

  const fbRows: ReturnType<typeof inlineButton>[][] = latest.variations.map((v, i) => [
    inlineButton(
      v.feedback === "up" ? "👍 Liked" : "👍 Like",
      `feedback:up:${latest.id}:${i}`,
    ),
    inlineButton(
      v.feedback === "down" ? "👎 Disliked" : "👎 Dislike",
      `feedback:down:${latest.id}:${i}`,
    ),
  ]);

  fbRows.push([inlineButton("⬅️ Back to menu", "menu:main")]);

  await ctx.reply(
    `Rate your latest icons for "${latest.prompt}":\n\n${lines.join("\n\n")}`,
    {
      parse_mode: "Markdown",
      reply_markup: inlineKeyboard(fbRows),
    },
  );
});

composer.callbackQuery(/^feedback:up:(.+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: "👍 Liked!" });
  const genId = ctx.match[1];
  const varIdx = parseInt(ctx.match[2], 10);
  const userId = ctx.from?.id ?? 0;
  await recordFeedback(userId, genId, varIdx, "up");
});

composer.callbackQuery(/^feedback:down:(.+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: "👎 Noted" });
  const genId = ctx.match[1];
  const varIdx = parseInt(ctx.match[2], 10);
  const userId = ctx.from?.id ?? 0;
  await recordFeedback(userId, genId, varIdx, "down");
});

export default composer;
