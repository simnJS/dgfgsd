import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction, GuildMember } from 'discord.js';


export class AutoRoleButton extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    });
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId === 'uefn_tester' || interaction.customId === 'map_creator') {
      return this.some();
    }
    return this.none();
  }

  public async run(interaction: ButtonInteraction) {

    console.log(interaction.customId);

    switch (interaction.customId) {
      case 'uefn_tester':
        await this.handleTesterRole(interaction.member as GuildMember, interaction);
        break;
      case 'map_creator':
        await this.handleCreatorRole(interaction.member as GuildMember, interaction);
        break;
    }

    return;
  }

  private checkIfUserHasRole(member: GuildMember, roleId: string) {
    return member.roles.cache.has(roleId);
  }

  private async handleTesterRole(member: GuildMember, i: ButtonInteraction) {
    const roleId = "1288891218675236895"
    if (!roleId) return;

    if (this.checkIfUserHasRole(member, roleId)) {
      await member.roles.remove(roleId);
      await i.reply({ content: 'Rôle retiré !', ephemeral: true });
      return;
    }

    await member.roles.add(roleId);
    await i.reply({ content: 'Rôle ajouté !', ephemeral: true });
  }

  private async handleCreatorRole(member: GuildMember, i: ButtonInteraction) {
    const roleId = "1288891332995317810"
    if (!roleId) return;

    if (this.checkIfUserHasRole(member, roleId)) {
      await member.roles.remove(roleId);
      await i.reply({ content: 'Rôle retiré !', ephemeral: true });
      return;
    }

    await member.roles.add(roleId);
    await i.reply({ content: 'Rôle ajouté !', ephemeral: true });
  }
}