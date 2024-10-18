import { Command, RegisterBehavior } from "@sapphire/framework";
import { EmbedBuilder, TextChannel } from "discord.js";
import dotenv from "dotenv";
dotenv.config();
export class WhoAreUs extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "whoareus",
            description: "Command to deploy the whoareus",
            aliases: ['wau'],
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
        .setDescription(
          `
**Who are us ?**

We are a team of developers who are passionate about creating Uefn Maps. We are always looking for new ideas to improve our maps and make them more fun. If you have any suggestions or feedback, feel free to contact us. We are always happy to hear from our players and make changes to our maps based on their feedback.

**Our Team**
Lead Developer: simnjs_
Lead Map Designer: Amnezi
Map Designer: Krystal

**Contact Us**
You can contact by creating a ticket in the support channel or by sending a message to one of the team members.

**Social Media**
Twitter: @ZZZ
Instagram: @ZZZ
          `
        )
        .setColor("Aqua")
    




        const message = await interaction.reply({
            content: "Information sent",
        });

        message.delete();

        await (interaction.channel as TextChannel).send({
            embeds: [embed]
        });

    }



  }
