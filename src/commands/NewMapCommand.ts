import { Command, RegisterBehavior } from "@sapphire/framework";
import axios from "axios";
import { EmbedBuilder, TextChannel } from "discord.js";
import dotenv from "dotenv";
dotenv.config();
export class NewMapCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "newmap",
            description: "Command to get information about a Fortnite map",
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
                .addStringOption((option) => option.setName('code').setDescription("code de la map").setRequired(true)),
            {
                behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
            }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
        const code = interaction.options.getString('code', true);

        // Axios 
        // POST https://fortniteapi.io/v1/creative/island?code={code} 
        // headers: {
        // Authorization: 'YOUR_API'
        // }

        const response = await axios.get(`https://fortniteapi.io/v1/creative/island?code=${code}`, {
            headers: {
                Authorization: process.env.FORTNITE_API_KEY
            }
        });

        const data = response.data.island;
        // Formated Date actual is 2023-11-16T14:04:57.967Z to 2023-11-16
        const date = data.publishedDate.split("T")[0];

        

        console.log(data);

        const embed = new EmbedBuilder()
            .setTitle(data.title)
            .setDescription(data.description)
            .setImage(data.image)
            .setColor("Aqua")
            .addFields(
              {
                name: 'Code',
                value: "\`"+data.code+"\`",
                inline: true
              },
              {
                name: "Publish Date",
                value: "\`"+date+"\`",
                inline: true
              },
              {
                name: "Tags",
                value: "\`"+data.tags.join(", ")+"\`",
                inline: true
              },


            )

        const message = await interaction.reply({
            content: "Information sent",
        });

        message.delete();

        await (interaction.channel as TextChannel).send({
            embeds: [embed]
        });

    }



  }
