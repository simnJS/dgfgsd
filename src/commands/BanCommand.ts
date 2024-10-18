import { Command, RegisterBehavior } from "@sapphire/framework";
import { Colors, EmbedBuilder, User } from "discord.js";

export class BanCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "ban",
            aliases: ['ban'],
            fullCategory: ['Moderation'],
            description: 'Command to ban a member',
            requiredClientPermissions: ['BanMembers'],
            requiredUserPermissions: ["BanMembers"],
            detailedDescription: 'Use this command to ban a member from the server. Example: /ban @member spam',
    });

    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption((option) => option.setName('user').setDescription("Member to ban").setRequired(true))
                .addStringOption((option) => option.setName('reason').setDescription("Reason for the ban").setRequired(true)),
            {
                behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
            }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
        const user = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', true);
        await this.ban(interaction, user, reason);
    }


    private async ban(i: Command.ChatInputCommandInteraction, user: User, reason: string) {
        const member = i.guild!.members.cache.get(user.id);

        const dmEmbed = new EmbedBuilder()
            .setColor(Colors.Red)
            .setAuthor({ name: i.user.tag, iconURL: i.user.displayAvatarURL() })
            .setDescription(`You have been banned from the server ${i.guild?.name} for the following reason: ${reason}`)
            .setFooter({ text: 'Developed by simnjs_' })
            .setTimestamp();


        if (member) {

            await member.send({
                embeds: [dmEmbed]
            })
                .catch(() => {
                    i.reply({
                        content: `Unable to send a direct message to the member ${user.tag}`,
                        ephemeral: true
                    });
                });

            await member.ban({ reason: reason })
                .then(() => {
                    i.reply({
                        content: `The member ${user.tag} has been banned for the following reason: ${reason}`,
                        ephemeral: true
                    });
                })
                .catch((error) => {
                    i.reply({
                        content: `Error banning the member: ${error}`,
                        ephemeral: true
                    });
                });
        } else {
            i.reply({
                content: `The member ${user.tag} is not on the server`,
                ephemeral: true
            });
        }
    }
}
