import { Command, RegisterBehavior } from "@sapphire/framework";
import { EmbedBuilder, TextChannel } from "discord.js";
import dotenv from "dotenv";
dotenv.config();
export class RulesCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "rules",
            description: "Command to get the rules of the server",
            aliases: ['rules'],
            requiredClientPermissions: ['SendMessages'],
            requiredUserPermissions: ["Administrator"],
            detailedDescription: 'Use this command to get the rules of the server. Example: /rules',
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
1. **Respectful Behavior**: Offensive content such as nudity, gore, racist, sexist, or violent remarks, disturbing images, and any inappropriate material is strictly prohibited. Let's maintain a positive and safe environment for everyone.

2. **Be Courteous**: Treat all community members with maturity and respect. Harassment, discrimination, or hostile behavior is not tolerated.

3. **Follow Staff Instructions**: Always respect and adhere to the instructions given by the staff members. They are here to help maintain order and ensure everyone has a good experience.

4. **Handle Disputes Privately**: Keep conflicts or drama out of public channels. If issues cannot be resolved privately, please contact a staff member for assistance.

5. **No Advertising**: Advertising other Discord servers, social media accounts, websites, or shops is not allowed unless explicitly approved by the staff.

6. **Impersonation**: Do not impersonate other community members, staff, or external individuals.

7. **Username Etiquette**: Avoid adding unnecessary symbols, letters, or numbers before your name to manipulate your position in the member list.

8. **Avoid Political Discussions**: Keep political discussions out of the community. Respect the opinions of others and contribute to a welcoming and positive atmosphere.

9. **Report Issues**: If you see something that violates the rules or makes you feel uncomfortable, notify the staff immediately. We strive to make this server a safe and welcoming space for everyone.
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
