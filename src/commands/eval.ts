import { Command, RegisterBehavior } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import { inspect } from 'util';
import { VM } from 'vm2';

export class EvalCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "eval",
            aliases: ['k'],
            fullCategory: ['Moderation'],
            description: "Evaluates JavaScript code in a sandboxed environment",
            requiredClientPermissions: ['Administrator'],
            requiredUserPermissions: ["ManageMessages"],
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) => option.setName('code').setDescription("Code to evaluate").setRequired(true)),
            {
                behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
            }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
        const code = interaction.options.getString('code', true);
        await this.eval(interaction, code);
    }

    // Main evaluation logic
    private async eval(interaction: Command.ChatInputCommandInteraction, code: string) {
        try {
            // Sandbox using vm2
            const vm = new VM({
                timeout: 1000, // 1 second timeout to prevent long-running code
                sandbox: {client: this.container.client, interaction} // Empty sandbox for security
            });

            const result = vm.run(`(async () => { ${code} })()`);

            const formattedResult = inspect(await result, { depth: 0 });
            const truncatedResult = this.truncate(formattedResult, 2000);

            const embed = new EmbedBuilder()
                .setTitle('Eval Result')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Input', value: `\`\`\`js\n${code}\n\`\`\`` },
                    { name: 'Output', value: `\`\`\`js\n${truncatedResult}\n\`\`\`` }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            const errorMessage = this.truncate((error as Error).toString(), 2000);

            const errorEmbed = new EmbedBuilder()
                .setTitle('Eval Error')
                .setColor(0xFF0000)
                .addFields(
                    { name: 'Input', value: `\`\`\`js\n${code}\n\`\`\`` },
                    { name: 'Error', value: `\`\`\`js\n${errorMessage}\n\`\`\`` }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }

    // Helper function to truncate long strings
    private truncate(text: string, maxLength: number): string {
        if (text.length > maxLength) {
            return `${text.slice(0, maxLength - 3)}...`;
        }
        return text;
    }
}
