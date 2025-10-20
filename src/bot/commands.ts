import { Env } from '../types';
import { KVStorage } from '../storage/kv';
import { R2Storage } from '../storage/r2';

export interface Command {
  name: string;
  description: string;
  adminOnly: boolean;
  handler: (args: string[], context: CommandContext) => Promise<string>;
}

export interface CommandContext {
  roomId: string;
  sender: string;
  env: Env;
  kvStorage: KVStorage;
  r2Storage: R2Storage;
}

export class CommandHandler {
  private commands: Map<string, Command> = new Map();

  constructor() {
    this.registerCommands();
  }

  private registerCommands() {
    this.commands.set('help', {
      name: 'help',
      description: 'Show available commands',
      adminOnly: false,
      handler: async (args, context) => {
        let help = '🤖 Available Commands:\n\n';

        const isAdmin = await context.kvStorage.isAdmin(context.sender);

        for (const [name, cmd] of this.commands) {
          if (cmd.adminOnly && !isAdmin) continue;
          help += `!${name} - ${cmd.description}\n`;
        }

        return help;
      },
    });

    this.commands.set('reset', {
      name: 'reset',
      description: 'Clear conversation history',
      adminOnly: false,
      handler: async (args, context) => {
        await context.r2Storage.clearConversationHistory(context.roomId);
        return '✅ Conversation history cleared.';
      },
    });

    this.commands.set('provider', {
      name: 'provider',
      description: 'Manage AI providers (list/set)',
      adminOnly: false,
      handler: async (args, context) => {
        if (args.length === 0 || args[0] === 'list') {
          const providers = await context.kvStorage.listProviders();
          const roomConfig = await context.kvStorage.getRoomConfig(context.roomId);
          const currentProvider = roomConfig?.provider || 'default';

          let response = '🔌 Available Providers:\n\n';
          for (const provider of providers) {
            const current = provider.name === currentProvider ? '✓' : ' ';
            response += `[${current}] ${provider.name}\n`;
            response += `    Base URL: ${provider.baseURL}\n`;
            response += `    Models: ${provider.models.join(', ')}\n\n`;
          }

          return response;
        }

        if (args[0] === 'set' && args[1]) {
          const providerName = args[1];
          const provider = await context.kvStorage.getProvider(providerName);

          if (!provider) {
            return `❌ Provider '${providerName}' not found. Use !provider list to see available providers.`;
          }

          const config = await context.kvStorage.getRoomConfig(context.roomId) || {};
          config.provider = providerName;
          config.model = provider.defaultModel;
          await context.kvStorage.setRoomConfig(context.roomId, config);

          return `✅ Provider set to '${providerName}' with model '${provider.defaultModel}'.`;
        }

        return '❌ Usage: !provider [list|set <name>]';
      },
    });

    this.commands.set('model', {
      name: 'model',
      description: 'Set AI model for this room',
      adminOnly: false,
      handler: async (args, context) => {
        if (args.length === 0) {
          const config = await context.kvStorage.getRoomConfig(context.roomId);
          return `Current model: ${config?.model || 'default'}`;
        }

        const modelName = args[0];
        const config = await context.kvStorage.getRoomConfig(context.roomId) || {};
        config.model = modelName;
        await context.kvStorage.setRoomConfig(context.roomId, config);

        return `✅ Model set to '${modelName}'.`;
      },
    });

    this.commands.set('addprovider', {
      name: 'addprovider',
      description: 'Add a new AI provider (admin only)',
      adminOnly: true,
      handler: async (args, context) => {
        if (args.length < 3) {
          return '❌ Usage: !addprovider <name> <baseURL> <apiKey> [models...]';
        }

        const [name, baseURL, apiKey, ...models] = args;

        await context.kvStorage.setProvider({
          name,
          baseURL,
          apiKey,
          models: models.length > 0 ? models : ['gpt-3.5-turbo', 'gpt-4'],
          defaultModel: models[0] || 'gpt-3.5-turbo',
        });

        return `✅ Provider '${name}' added successfully.`;
      },
    });

    this.commands.set('delprovider', {
      name: 'delprovider',
      description: 'Delete an AI provider (admin only)',
      adminOnly: true,
      handler: async (args, context) => {
        if (args.length === 0) {
          return '❌ Usage: !delprovider <name>';
        }

        const name = args[0];
        await context.kvStorage.deleteProvider(name);

        return `✅ Provider '${name}' deleted.`;
      },
    });

    this.commands.set('seturl', {
      name: 'seturl',
      description: 'Set custom OpenAI base URL (admin only)',
      adminOnly: true,
      handler: async (args, context) => {
        if (args.length === 0) {
          return '❌ Usage: !seturl <baseURL>';
        }

        const baseURL = args[0];
        const config = await context.kvStorage.getGlobalConfig();
        config.defaultBaseURL = baseURL;
        await context.kvStorage.setGlobalConfig(config);

        return `✅ Default base URL set to '${baseURL}'.`;
      },
    });

    this.commands.set('stats', {
      name: 'stats',
      description: 'Show bot statistics (admin only)',
      adminOnly: true,
      handler: async (args, context) => {
        const conversations = await context.r2Storage.listConversations();
        const providers = await context.kvStorage.listProviders();

        let stats = '📊 Bot Statistics:\n\n';
        stats += `Active conversations: ${conversations.length}\n`;
        stats += `Registered providers: ${providers.length}\n`;

        return stats;
      },
    });

    this.commands.set('gpt', {
      name: 'gpt',
      description: 'Chat with GPT (anyone can use)',
      adminOnly: false,
      handler: async (args) => {
        if (args.length === 0) {
          return 'Usage: !gpt <your message>';
        }
        return '';
      },
    });
  }

  async handleCommand(message: string, context: CommandContext): Promise<string | null> {
    if (!message.startsWith('!')) {
      return null;
    }

    const parts = message.slice(1).trim().split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const command = this.commands.get(commandName);
    if (!command) {
      return null;
    }

    if (commandName === 'gpt') {
      return null;
    }

    if (command.adminOnly) {
      const isAdmin = await context.kvStorage.isAdmin(context.sender);
      if (!isAdmin) {
        return '❌ This command is only available to administrators.';
      }
    }

    try {
      return await command.handler(args, context);
    } catch (error) {
      return `❌ Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}
