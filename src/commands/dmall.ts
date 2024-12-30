import { Command, RegisterBehavior } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

export class DmAllCommad extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'dmall',
      description: 'Command to send a message to all members of the server',
      aliases: ['nm'],
      requiredClientPermissions: ['SendMessages'],
      requiredUserPermissions: ['Administrator'],
      detailedDescription: 'Use this command to get information about a Fortnite map. Example: /newmap 1234-5678-9101'
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName(this.name)
          .setDescription(this.description)
          .addStringOption((option) => option.setName('title').setDescription('title of the embed').setRequired(true))
          .addStringOption((option) => option.setName('description').setDescription('description of the embed').setRequired(true)),
      {
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite
      }
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    const startTime = Date.now();
    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description', true);

    const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor('Aqua');

    const members = await interaction.guild!.members.fetch();

    let Success = 0;
    let Fail = 0;

    interaction.reply({ content: `Sending message to ${members.size} members`, ephemeral: true });

    await Promise.all(members.map(async (member) => {
      try {
        await member.send({ embeds: [embed] });
        Success++;
      } catch (error) {
        Fail++;
      }
    }));

    const endTime = Date.now();
    const processTime = (endTime - startTime) / 1000; // in seconds

    interaction.followUp({ content: `Message sent to ${Success} members and failed to send to ${Fail} members. Process time: ${processTime} seconds` });
  }
}
