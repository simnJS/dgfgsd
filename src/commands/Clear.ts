import { Command, RegisterBehavior } from "@sapphire/framework";
import { TextChannel } from "discord.js";

export class ClearCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "clear",
            aliases: ['k'],
            fullCategory: ['Moderation'],
            description: "Command to clear messages",
            requiredClientPermissions: ['ManageMessages'],
            requiredUserPermissions: ["ManageMessages"],
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addNumberOption((option) => option.setName('messages').setDescription("Messages to clear").setRequired(true)),
            {
                behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
            }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
        const quantity = interaction.options.getNumber('messages', true);
        await this.clear(interaction, quantity);
    }


    private clear(i: Command.ChatInputCommandInteraction, quantity: number) {
        const channel = i.channel as TextChannel;

        if (quantity > 100) {
            i.reply({
                content: "You can't delete more than 100 messages at once",
                ephemeral: true
            });
            return;
        }

        channel.bulkDelete(quantity, true)
            .then(() => {
                i.reply({
                    content: `Successfully deleted ${quantity} messages`,
                    ephemeral: true
                });
            })
            .catch((error) => {
                i.reply({
                    content: `An error occurred: ${error}`,
                    ephemeral: true
                });
            });



    }





}