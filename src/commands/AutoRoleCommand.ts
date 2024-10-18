import { Command, RegisterBehavior } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from "discord.js";
import dotenv from "dotenv";
dotenv.config();
export class AutoRoleCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "autorole",
            description: "Command to deploy the autorole",
            aliases: ['ar'],
            requiredClientPermissions: ['SendMessages'],
            requiredUserPermissions: ["Administrator"],
    });

    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description),
            {
                behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
            }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
      const embed = new EmbedBuilder()
      .setTitle('Choose your roles')
      .setDescription(
`
To get started, click on the buttons to receive the role mentions that interest you.

------------------------------------------------
**🔧 - UEFN Tester | To help us to test our maps
🚧 - Map Creator | If you are a UEFN map creator**
------------------------------------------------
`
      )
      .setColor('Blue')
      .setTimestamp()

    const actionRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('uefn_tester')
          .setLabel('UEFN Tester')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('map_creator')
          .setLabel('Map Creator')
          .setStyle(ButtonStyle.Primary),
      );


        const message = await interaction.reply({
            content: "Information sent",
        });

        message.delete();

        await (interaction.channel as TextChannel).send({
            embeds: [embed],
            components: [actionRow]
        });

    }



  }
