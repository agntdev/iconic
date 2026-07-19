import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  inlineButton,
  inlineKeyboard,
} from "../toolkit/index.js";
import {
  getUserGenerations,
  deleteGeneration,
  getGeneration,
} from "../store.js";

const PER_PAGE = 3;

const composer = new Composer<Ctx>();

function renderHistoryPage(
  gens: Awaited<ReturnType<typeof getUserGenerations>>,
  page: number,
) {
  const start = page * PER_PAGE;
  const pageGens = gens.slice(start, start + PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(gens.length / PER_PAGE));

  if (pageGens.length === 0) {
    return {
      text: "No icon history yet — tap 🎨 Generate to create your first set!",
      keyboard: inlineKeyboard([
        [inlineButton("🎨 Generate", "generate:start")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    };
  }

  const lines = pageGens.map((g, i) => {
    const date = new Date(g.timestamp).toLocaleDateString();
    const short = g.prompt.length > 40 ? g.prompt.slice(0, 40) + "…" : g.prompt;
    return `${start + i + 1}. "${short}" — ${date}`;
  });

  const rows: ReturnType<typeof inlineButton>[][] = pageGens.map((g, i) => [
    inlineButton(`📥 ${start + i + 1}. "${g.prompt.slice(0, 20)}…"`, `history:detail:${g.id}`),
  ]);

  const controls: ReturnType<typeof inlineButton>[] = [];
  if (page > 0) controls.push(inlineButton("« Prev", `history:page:${page - 1}`));
  if (page < totalPages - 1) controls.push(inlineButton("Next »", `history:page:${page + 1}`));
  if (controls.length > 0) rows.push(controls);

  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);

  return {
    text: `Your icon history (${gens.length} total):\n\n${lines.join("\n")}`,
    keyboard: inlineKeyboard(rows),
  };
}

composer.command("history", async (ctx) => {
  const userId = ctx.from?.id ?? 0;
  const gens = await getUserGenerations(userId);
  const { text, keyboard } = renderHistoryPage(gens, 0);
  await ctx.reply(text, { reply_markup: keyboard });
});

composer.callbackQuery("history:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id ?? 0;
  const gens = await getUserGenerations(userId);
  const { text, keyboard } = renderHistoryPage(gens, 0);
  await ctx.editMessageText(text, { reply_markup: keyboard });
});

composer.callbackQuery(/^history:page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const page = parseInt(ctx.match[1], 10);
  const userId = ctx.from?.id ?? 0;
  const gens = await getUserGenerations(userId);
  const { text, keyboard } = renderHistoryPage(gens, page);
  await ctx.editMessageText(text, { reply_markup: keyboard });
});

composer.callbackQuery(/^history:detail:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const genId = ctx.match[1];
  const gen = await getGeneration(genId);
  if (!gen) {
    await ctx.reply("That generation no longer exists.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const lines = gen.variations.map(
    (v, i) => `*${i + 1}. ${v.caption}*\n${v.iconLines.join("\n")}`,
  );

  const fbRows: ReturnType<typeof inlineButton>[][] = gen.variations.map((v, i) => [
    inlineButton(
      v.feedback === "up" ? "👍 Liked" : "👍 Like",
      `feedback:up:${genId}:${i}`,
    ),
    inlineButton(
      v.feedback === "down" ? "👎 Disliked" : "👎 Dislike",
      `feedback:down:${genId}:${i}`,
    ),
  ]);

  fbRows.push([
    inlineButton("🗑 Delete", `history:delete:${genId}`),
    inlineButton("⬅️ Back", "history:show"),
  ]);

  await ctx.editMessageText(
    `"${gen.prompt}"\n\n${lines.join("\n\n")}`,
    {
      parse_mode: "Markdown",
      reply_markup: inlineKeyboard(fbRows),
    },
  );
});

composer.callbackQuery(/^history:delete:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Deleted" });
  const genId = ctx.match[1];
  const userId = ctx.from?.id ?? 0;
  await deleteGeneration(userId, genId);
  const gens = await getUserGenerations(userId);
  const { text, keyboard } = renderHistoryPage(gens, 0);
  await ctx.editMessageText(text, { reply_markup: keyboard });
});

export default composer;
