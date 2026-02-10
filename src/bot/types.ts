import { Context, Scenes } from 'telegraf';

export interface SessionData extends Scenes.WizardSessionData {
  temp?: Record<string, unknown>;
}

export interface BotContext extends Context, Scenes.WizardContext<SessionData> {}
