import { Command, RegisterBehavior } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import dotenv from "dotenv";
dotenv.config();
export class DmAllCommad extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "dmall",
            description: "Command to send a message to all members of the server",
            aliases: ['nm'],
            requiredClientPermissions: ['SendMessages'],
            requiredUserPermissions: ["Administrator"],
            detailedDescription: 'Use this command to get information about a Fortnite map. Example: /newmap 1234-5678-9101',
    });

    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) => option.setName('title').setDescription("title of the embed").setRequired(true))
                .addStringOption((option) => option.setName('description').setDescription("description of the embed").setRequired(true)),
            {
                behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
            }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
        const title = interaction.options.getString('title', true);
        const description = interaction.options.getString('description', true);

        const AllMembers = interaction.guild!.members.cache;

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor("Aqua");

        AllMembers.forEach(async (member) => {
            if (member.user.bot) return;
            
            await member.send({ embeds: [embed] }).catch((error) => {
                console.error(error);
            }
            );
        });
    }
  }
