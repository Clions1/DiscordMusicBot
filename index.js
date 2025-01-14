require('dotenv').config();
const { Client, Intents } = require('discord.js');
const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.MESSAGE_CONTENT
    ]
});

class MusicPlayer {
    constructor() {
        this.queue = [];
        this.isPlaying = false;
        this.connection = null;
        this.player = createAudioPlayer();
    }

    async playNext(message) {
        if (this.queue.length > 0 && this.connection) {
            this.isPlaying = true;
            const url = this.queue.shift();

            try {
                const stream = await play.stream(url);
                const resource = createAudioResource(stream.stream, {
                    inputType: stream.type
                });

                this.player.play(resource);
                this.connection.subscribe(this.player);

                this.player.on(AudioPlayerStatus.Idle, () => {
                    this.playNext(message);
                });
            } catch (error) {
                console.error(error);
                message.channel.send('Şarkı çalınırken bir hata oluştu!');
                this.isPlaying = false;
            }
        } else {
            this.isPlaying = false;
        }
    }
}

const musicPlayer = new MusicPlayer();

client.on('ready', () => {
    console.log(`${client.user.tag} olarak giriş yapıldı!`);
});

client.on('messageCreate', async message => {
    if (!message.content.startsWith('!') || message.author.bot) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        if (!message.member.voice.channel) {
            return message.reply('Bir ses kanalında olmalısınız!');
        }

        const url = args[0];
        if (!url) return message.reply('Bir YouTube linki belirtmelisiniz!');

        if (!musicPlayer.connection) {
            musicPlayer.connection = joinVoiceChannel({
                channelId: message.member.voice.channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });
        }

        musicPlayer.queue.push(url);
        message.channel.send('Şarkı sıraya eklendi!');

        if (!musicPlayer.isPlaying) {
            await musicPlayer.playNext(message);
        }
    }

    else if (command === 'skip') {
        if (musicPlayer.player) {
            musicPlayer.player.stop();
            message.channel.send('Şarkı atlandı!');
        }
    }

    else if (command === 'queue') {
        if (musicPlayer.queue.length === 0) {
            return message.channel.send('Sırada şarkı yok!');
        }
        const queueList = musicPlayer.queue.map((url, index) => `${index + 1}. ${url}`).join('\n');
        message.channel.send(`Sıradaki şarkılar:\n${queueList}`);
    }

    else if (command === 'clear') {
        musicPlayer.queue = [];
        message.channel.send('Şarkı sırası temizlendi!');
    }

    else if (command === 'leave') {
        if (musicPlayer.connection) {
            musicPlayer.connection.destroy();
            musicPlayer.connection = null;
            musicPlayer.queue = [];
            musicPlayer.isPlaying = false;
            message.channel.send('Kanaldan ayrıldım!');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
