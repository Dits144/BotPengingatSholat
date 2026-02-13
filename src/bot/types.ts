import { Context, Scenes } from 'telegraf';
import { Role } from '../db/models/types';

export interface SessionData extends Scenes.WizardSessionData {
  loginRole?: Role;
}

export interface BotContext extends Context, Scenes.WizardContext<SessionData> {}
