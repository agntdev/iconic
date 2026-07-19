import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  mainMenuKeyboard,
} from "../toolkit/index.js";

registerMainMenuItem({ label: "🎨 Generate", data: "generate:start", order: 10 });
registerMainMenuItem({ label: "📜 History", data: "history:show", order: 20 });

const composer = new Composer<Ctx>();

const WELCOME =
  "👋 Welcome to Iconic! Generate creative icons from text prompts.\n\n" +
  "Tap a button below to get started.";

composer.command("start", async (ctx) => {
  ctx.session.step = "idle";
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "idle";
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;
