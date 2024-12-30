import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, Message, TextChannel } from 'discord.js';
import Groq from 'groq-sdk';

@ApplyOptions<Listener.Options>({
  event: Events.MessageCreate
})
export class MessageAnalyzerListener extends Listener {
  private groq: Groq;
  private readonly LOG_CHANNEL_ID = '1293948326642847918';

  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, options);
    
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }

  public async run(message: Message) {
    if (message.author.bot) return;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `
You are a message analyzer that classifies user messages into three categories:

1. **INSULT**: Messages containing explicit personal attacks, vulgarities, or hateful language directed at an individual.  
   - **Includes**:  
     - Explicit insults (e.g., "You're an idiot," "T'es un connard").  
     - Personal attacks with degrading language.  
     - Vulgar slurs aimed at an individual.

   - **Excludes**:  
     - General critiques of ideas or behavior without personal attacks (e.g., "That's a dumb idea").  
     - Mild remarks like "shut up."

   - Examples of INSULT:  
     - "You're an idiot."  
     - "T'es un connard."  
     - "Get lost, loser."  

2. **CODE**: Messages explicitly **asking for** or **requesting information about** any type of code (e.g., access codes, game codes, activation codes, cheat codes, battle pass codes, etc.).  
   - **Note**: Statements merely mentioning codes (without a question or request) should NOT be classified as CODE.

   - Examples of CODE:  
     - "Do you have the Fortnite battle pass code?"  
     - "Where can I get a cheat code for this game?"  
     - "Can someone share an activation code with me?"  

   - Not CODE:  
     - "For the codes, it's fine."  
     - "Codes are useful in some cases."  

3. **CLEAN**: Messages that do not fit into the above categories. This includes general discussions, statements about codes, or system explanations (e.g., "How does the system classify insults?").

   - Examples of CLEAN:  
     - "For the codes, it's fine."  
     - "Can you explain how this works?"  
     - "That's not very nice of you."  
     - "Codes are useful in some cases."

**Important note**: Any message discussing the system itself, its rules, or its functionality should be classified as CLEAN.

            `
          },
          {
            role: 'user',
            content: message.content
          }
        ],
        model: 'llama3-8b-8192',
        temperature: 0.3,
        max_tokens: 10
      });

      const response = completion.choices[0]?.message?.content?.trim();

      switch (response) {
        case 'INSULT':
          await message.delete();

          const warningMessage = await (message.channel as TextChannel).send({
            content: `${message.author}, your message has been deleted because it contained inappropriate content.`
          });

          setTimeout(() => warningMessage.delete(), 5000);

          const logChannel = this.container.client.channels.cache.get(this.LOG_CHANNEL_ID) as TextChannel;
          if (logChannel) {
            await logChannel.send({
              content: `**Deleted Message - Insult Detected**\nAuthor: ${message.author.tag}\nChannel: ${message.channel}\nContent: ||${message.content}||`
            });
          }
          break;

        case 'CODE':
          await message.reply({
            content: 'Hi! This is the codes channel : <#1310244081154261002>.',
            allowedMentions: { repliedUser: true }
          });
          break;
      }

    } catch (error) {
      console.error('Error during message analysis:', error);
    }
  }
}