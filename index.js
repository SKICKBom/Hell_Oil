// เรียกใช้งาน dotenv เพื่อโหลด Token จากไฟล์ .env
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

// สร้าง client สำหรับบอท
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages
    ]
});

// เมื่อบอทพร้อม (login สำเร็จ) ให้แสดงข้อความใน console
client.once('ready', () => {
    console.log('บอทออนไลน์แล้ว!');
});

// ตั้งค่า Welcome
const welcomeChannelId = '1300542861552517171'; // ใส่ ID ของแชนแนลต้อนรับ
const welcomeMessage = member => `ยินดีต้อนรับ ${member} เข้าสู่เซิร์ฟเวอร์! 🎉 โปรดแนะนำตัวและสนุกกับการพูดคุยกัน!`;

// กำหนดให้บอทตรวจจับเมื่อมีสมาชิกใหม่เข้าร่วมเซิร์ฟเวอร์
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
});

// ตรวจสอบข้อความที่ส่งเข้ามา
client.on('messageCreate', async message => {
    // ตรวจสอบว่าเป็นคำสั่ง !sent
    if (message.content.startsWith('!sent')) {
        const userMessage = message.content.slice(6).trim();
        if (userMessage) {
            message.channel.send(userMessage);
        } else {
            message.channel.send('โปรดใส่ข้อความหลังคำสั่ง !sent');
        }
    }

    // ตรวจสอบว่าเป็นคำสั่ง !clear
    if (message.content === '!clear') {
        if (!message.member.permissions.has('MANAGE_MESSAGES')) {
            return message.reply('คุณไม่มีสิทธิ์ในการลบข้อความ');
        }

        try {
            await message.channel.bulkDelete(100, true);
            message.channel.send('Success ♻️').then(msg => {
                setTimeout(() => msg.delete(), 3000); // ลบข้อความแจ้งเตือนหลัง 3 วินาที
            });
        } catch (error) {
            console.error(error);
            message.channel.send('เกิดข้อผิดพลาดในการลบข้อความ');
        }
    }

    // ตรวจสอบว่าเป็นคำสั่ง !server เพื่อส่ง Embed จากข้อมูลที่ผู้ใช้ป้อน
    if (message.content.startsWith('!server')) {
        // แยกข้อความที่ตามหลัง !server ออกมาโดยใช้ | เป็นตัวแยก
        const args = message.content.split('|').map(arg => arg.trim()).slice(1);
        if (args.length < 6) {
            return message.channel.send('กรุณาใส่ข้อมูลตามรูปแบบ: `!server | icon_url | name | image_url | Server IP | Link Discord | Guidelines`');
        }

        // แยกพารามิเตอร์ที่ได้รับ
        const [iconURL, name, imageURL, serverIP, discordLink, guidelines] = args;

        // ตรวจสอบว่า URL ทั้ง iconURL และ imageURL ถูกต้อง
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

        // แปลงชื่อเป็นตัวใหญ่ทั้งหมดและใส่ [] รอบๆ ชื่อ
        const formattedName = `[ ${name.toUpperCase()} ]`;

        // สร้าง Embed ตามข้อมูลที่ได้รับจากผู้ใช้
        const embed = new EmbedBuilder()
            .setColor(0x9B59B6) // สีจาก JSON (10158080 = 0x9B59B6)
            .setDescription(`**IP :  [ ${serverIP} ]**\n**Link : [ ${discordLink} ]**\n**Guide : [ ${guidelines} ]**`)
            .setAuthor({
                name: formattedName,
                iconURL: iconURL
            })
            .setImage(imageURL);

        // ส่ง Embed ที่สร้างขึ้น
        await message.channel.send({ embeds: [embed] });

        // ลบข้อความที่ผู้ใช้ส่งมา
        await message.delete();
    }
});

// Login ด้วย Token จาก .env
client.login(process.env.DISCORD_TOKEN);
