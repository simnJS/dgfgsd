import { ApplyOptions } from '@sapphire/decorators';
import { Events } from '@sapphire/framework';
import { Listener } from '@sapphire/framework';
import type { GuildMember } from 'discord.js';
import { EmbedBuilder } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: Events.GuildMemberAdd
})
export class GuildMemberAddEvent extends Listener<typeof Events.GuildMemberAdd> {
  public async run(member: GuildMember) {

    const embed = new EmbedBuilder()
      .setTitle('Welcome to Safia Creative')
      .setDescription(`Welcome to the server ${member.user.username}, you can find all codes in the channel <#1310244081154261002>`)
      .setColor("Aqua");

    try {
      await member.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
    }
  }
}
