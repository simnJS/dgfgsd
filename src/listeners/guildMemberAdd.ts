import type { Events } from '@sapphire/framework';
import { Listener } from '@sapphire/framework';
import type { GuildMember, TextChannel } from 'discord.js';
import { CanvasRenderingContext2D, createCanvas, loadImage } from 'canvas';
import { AttachmentBuilder } from 'discord.js';

export class GuildMemberAddEvent extends Listener<typeof Events.GuildMemberAdd> {
  public async run(member: GuildMember) {
    // Get the channel where to send the message
    const channel = member.guild.channels.cache.get('1288893490071343105') as TextChannel;

    if (!channel) return;

    // Define canvas dimensions
    const canvas = createCanvas(700, 250);
    const ctx = canvas.getContext('2d');

    // Load and draw the background image
    const background = await loadImage('files/welcome.png');
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    // Draw a dark rectangle with rounded corners in the center
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Semi-transparent dark rectangle
    this.drawRoundedRect(ctx, 50, 25, canvas.width - 100, canvas.height - 50, 20); // 20 is the radius for rounded corners
    ctx.fill();

    // Load the user's avatar
    const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png' }));

    // Draw a rounded avatar
    ctx.save(); // Save the current state
    ctx.beginPath();
    ctx.arc(350, 100, 50, 0, Math.PI * 2, true); // Circle for the avatar
    ctx.closePath();
    ctx.clip(); // Clip to the circle

    // Draw the avatar image
    ctx.drawImage(avatar, 300, 50, 100, 100); // Adjust the position and size for the avatar
    ctx.restore(); // Restore the previous state to remove the clipping

    // Add text below the avatar inside the dark rectangle
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${member.user.username} just discovered Safia Creative`, canvas.width / 2, 200);

    // Create a new canvas for the final rounded image
    const finalCanvas = createCanvas(canvas.width, canvas.height);
    const finalCtx = finalCanvas.getContext('2d');

    // Draw a rounded rectangle as the mask for the final image
    finalCtx.save();
    this.drawRoundedRect(finalCtx, 0, 0, finalCanvas.width, finalCanvas.height, 20); // Use the same radius for consistency
    finalCtx.clip();

    // Draw the temporary canvas onto the final canvas
    finalCtx.drawImage(canvas, 0, 0);
    finalCtx.restore();

    // Create an attachment from the final canvas
    const attachment = new AttachmentBuilder(finalCanvas.toBuffer(), { name: 'welcome-image.png' });

    // Send the image in the channel
    await channel.send({ content: `Welcome to the server, <@${member.user.id}>!`, files: [attachment] });
  }

  // Function to draw a rounded rectangle
  private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
