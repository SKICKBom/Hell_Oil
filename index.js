require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const ytSearch = require('yt-search');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates
    ]
});

let autorole = null;
const welcomeChannelId = '1300542861552517171';
const player = createAudioPlayer();

client.once('ready', () => {
    console.log('บอทออนไลน์แล้ว!');
});

// Welcome Message
const welcomeMessage = member => `ยินดีต้อนรับ ${member} เข้าสู่เซิร์ฟเวอร์! 🎉 โปรดแนะนำตัวและสนุกกับการพูดคุยกัน!`;

client.on('guildMemberAdd', async member => {
    const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
    if (welcomeChannel) {
        welcomeChannel.send(welcomeMessage(member));
    }

    try {
        await member.send(`ยินดีต้อนรับ ${member.user.tag} สู่เซิร์ฟเวอร์! หวังว่าคุณจะสนุกกับการอยู่ที่นี่`);
    } catch (error) {
        console.error(`ไม่สามารถส่ง DM ให้ ${member.user.tag}`);
    }

    if (autorole) {
        const role = member.guild.roles.cache.find(r => r.name === autorole);
        if (role) {
            await member.roles.add(role).catch(console.error);
        } else {
            console.log(`ไม่พบยศที่ชื่อว่า "${autorole}"`);
        }
    }
});

client.on('messageCreate', async message => {
    // คำสั่งเล่นเพลง
    if (message.content.startsWith('!play')) {
        const args = message.content.split(' ').slice(1);
        const songName = args.join(' ');

        if (!songName) return message.channel.send('โปรดระบุชื่อเพลงหรือ URL หลังคำสั่ง !play');

        if (!message.member.voice.channel) {
            return message.channel.send('คุณต้องเข้าร่วมห้องเสียงก่อนใช้คำสั่ง !play');
        }

        try {
            const result = await ytSearch(songName);
            if (result.videos.length === 0) return message.channel.send('ไม่พบเพลงที่คุณต้องการ');

            const song = result.videos[0];
            message.channel.send(`🎶 กำลังเล่น: ${song.title}`);

            const stream = await play.stream(song.url);
            const resource = createAudioResource(stream.stream, {
                inputType: stream.type,
            });

            player.play(resource);

            const connection = joinVoiceChannel({
                channelId: message.member.voice.channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Playing, () => {
                console.log('บอทเริ่มเล่นเพลงแล้ว');
            });

            player.on('error', error => {
                console.error(`เกิดข้อผิดพลาดขณะเล่นเพลง: ${error.message}`);
                message.channel.send('เกิดข้อผิดพลาดขณะเล่นเพลง');
            });
        } catch (error) {
            console.error(`เกิดข้อผิดพลาด: ${error.message}`);
            message.channel.send('ไม่สามารถเล่นเพลงได้ในขณะนี้');
        }
    }

    // คำสั่งหยุดเพลง
    if (message.content === '!stop') {
        player.stop();
        message.channel.send('🛑 หยุดเพลงแล้ว');
    }

    // คำสั่ง !sent สำหรับส่งข้อความ
    if (message.content.startsWith('!sent')) {
        const userMessage = message.content.slice(6).trim();
        if (userMessage) {
            message.channel.send(userMessage);
        } else {
            message.channel.send('โปรดใส่ข้อความหลังคำสั่ง !sent');
        }
        await message.delete();
    }

    // คำสั่ง !clear สำหรับลบข้อความ
    if (message.content === '!clear') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('คุณไม่มีสิทธิ์ในการลบข้อความ');
        }

        try {
            await message.channel.bulkDelete(100, true);
            message.channel.send('Success ♻️').then(msg => {
                setTimeout(() => msg.delete(), 3000);
            });
        } catch (error) {
            console.error(error);
            message.channel.send('เกิดข้อผิดพลาดในการลบข้อความ');
        }
    }

    // คำสั่ง !autorole สำหรับกำหนดยศอัตโนมัติ
    if (message.content.startsWith('!autorole')) {
        const roleName = message.content.slice(10).trim();
        if (!roleName) {
            return message.channel.send('โปรดระบุชื่อยศหลังคำสั่ง !autorole');
        }

        autorole = roleName;
        message.channel.send(`ตั้งค่า Autorole เป็น "${autorole}" แล้ว`).then(msg => {
            setTimeout(() => msg.delete(), 3000);
        });
        await message.delete();
    }

    // คำสั่ง !deautorole สำหรับหยุดการกำหนดยศอัตโนมัติ
    if (message.content === '!deautorole') {
        autorole = null;
        message.channel.send('หยุดการกำหนดยศอัตโนมัติเรียบร้อยแล้ว').then(msg => {
            setTimeout(() => msg.delete(), 3000);
        });
        await message.delete();
    }

    // คำสั่ง !server สำหรับแสดงข้อมูลเซิร์ฟเวอร์
    if (message.content.startsWith('!server')) {
        const args = message.content.split('|').map(arg => arg.trim()).slice(1);
        if (args.length < 6) {
            return message.channel.send('กรุณาใส่ข้อมูลตามรูปแบบ: `!server | icon_url | name | image_url | Server IP | Link Discord | Guidelines`');
        }

        const [iconURL, name, imageURL, serverIP, discordLink, guidelines] = args;

        const isValidUrl = (url) => {
            try {
                new URL(url);
                return true;
            } catch (error) {
                return false;
            }
        };

        if (!isValidUrl(iconURL) || !isValidUrl(imageURL)) {
            return message.channel.send('กรุณาใส่ URL ที่ถูกต้องสำหรับ icon_url และ image_url');
        }

        const formattedName = `[ ${name.toUpperCase()} ]`;

        const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setDescription(`**IP :  [ ${serverIP} ]**\n**Link : [ ${discordLink} ]**\n**Guide : [ ${guidelines} ]**`)
            .setAuthor({
                name: formattedName,
                iconURL: iconURL
            })
            .setImage(imageURL);

        await message.channel.send({ embeds: [embed] });
        await message.delete();
    }
});

// จัดการสถานะของตัวเล่นเพลง
player.on(AudioPlayerStatus.Idle, () => {
    console.log('เพลงจบแล้ว');
});

client.login(process.env.DISCORD_TOKEN);
