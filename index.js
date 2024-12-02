const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { token, clientId, reportChannelId } = require('./config.json'); // 確保在 config.json 中添加 reportChannelId

// 初始化 Discord 客戶端
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent] });

// 註冊指令
const commands = [
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('在指定頻道發送訊息')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('選擇要發送訊息的頻道')
        .addChannelTypes(0) // 0 代表 GuildText (文字頻道)
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('message')
        .setDescription('你想說的訊息')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('embed')
    .setDescription('發送嵌入訊息')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('嵌入訊息標題')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('description')
        .setDescription('嵌入訊息內容')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('color')
        .setDescription('嵌入訊息顏色')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('dm')
    .setDescription('發送訊息到指定使用者的 DM')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('選擇要發送訊息的使用者')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('message')
        .setDescription('要發送的訊息')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('report')
    .setDescription('回報問題或事件')
    .addStringOption(option =>
      option.setName('issue')
        .setDescription('描述你想回報的問題或事件')
        .setRequired(true)
    )
].map(command => command.toJSON());

// 註冊指令
const { REST, Routes } = require('discord.js');
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('開始註冊指令...');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('指令註冊成功！');
  } catch (error) {
    console.error('指令註冊失敗：', error);
  }
})();

// 監聽事件
client.on('ready', () => {
  console.log(`${client.user.tag} 已啟動！`);
});

// 處理指令
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  // 檢查是否已回應過
  const hasReplied = interaction.replied || interaction.deferred;

  // 只允許管理員使用 /say 指令
  if (interaction.commandName === 'say') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      if (!hasReplied) {
        return interaction.reply({ content: '你需要管理員權限來執行此指令！', ephemeral: true });
      }
    }

    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message');

    if (!channel || !message) {
      if (!hasReplied) {
        return await interaction.reply({ content: '無效的參數！', ephemeral: true });
      }
    }

    // 檢查機器人是否有對此頻道的發送訊息權限
    const permissions = channel.permissionsFor(interaction.guild.members.me);
    if (!permissions.has(PermissionsBitField.Flags.SendMessages)) {
      if (!hasReplied) {
        return interaction.reply({ content: '機器人沒有權限在該頻道發送訊息！', ephemeral: true });
      }
    }

    try {
      // 嘗試發送訊息
      await channel.send(message);

      // 確保只回應一次
      if (!hasReplied) {
        await interaction.reply({ content: `訊息已成功發送到 ${channel.name}`, ephemeral: true });
      } else {
        await interaction.followUp({ content: `訊息已成功發送到 ${channel.name}`, ephemeral: true });
      }
    } catch (error) {
      console.error('發送訊息失敗：', error);
      // 確保只回應一次
      if (!hasReplied) {
        await interaction.reply({ content: '發送訊息時發生錯誤！', ephemeral: true });
      } else {
        await interaction.followUp({ content: '發送訊息時發生錯誤！', ephemeral: true });
      }
    }
  }

  // 處理 /embed 指令
  if (interaction.commandName === 'embed') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      if (!hasReplied) {
        return interaction.reply({ content: '你需要管理員權限來執行此指令！', ephemeral: true });
      }
    }

    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const color = interaction.options.getString('color') || '#00FF00'; // 預設顏色是綠色

    // 創建嵌入訊息
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color);

    try {
      // 確保只回應一次
      if (!hasReplied) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.followUp({ embeds: [embed] });
      }
    } catch (error) {
      console.error('發送嵌入訊息時發生錯誤：', error);
      // 確保只回應一次
      if (!hasReplied) {
        await interaction.reply({ content: '發送嵌入訊息時發生錯誤！', ephemeral: true });
      } else {
        await interaction.followUp({ content: '發送嵌入訊息時發生錯誤！', ephemeral: true });
      }
    }
  }

  // 處理 /dm 指令
  if (interaction.commandName === 'dm') {
    // 檢查是否為管理員
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      if (!hasReplied) {
        return interaction.reply({ content: '你需要管理員權限來執行此指令！', ephemeral: true });
      }
    }

    const user = interaction.options.getUser('user');
    const message = interaction.options.getString('message');

    if (!user || !message) {
      if (!hasReplied) {
        return interaction.reply({ content: '無效的參數！', ephemeral: true });
      }
    }

    try {
      // 創建嵌入訊息
      const dmEmbed = new EmbedBuilder()
        .setTitle('你收到了一條訊息')
        .setDescription(message)
        .setColor('#FF4500')
        .addFields([
          { name: '來源伺服器', value: interaction.guild.name },
          { name: '發送者', value: `${interaction.user.tag}` }
        ])
        .setFooter({ text: `發送自 ${interaction.guild.name}` });

      // 發送 DM
      await user.send({ embeds: [dmEmbed] });

      // 確保只回應一次
      if (!hasReplied) {
        await interaction.reply({ content: `訊息已成功發送到 ${user.username} 的 DM！`, ephemeral: true });
      } else {
        await interaction.followUp({ content: `訊息已成功發送到 ${user.username} 的 DM！`, ephemeral: true });
      }
    } catch (error) {
      console.error('發送 DM 時發生錯誤：', error);
      // 確保只回應一次
      if (!hasReplied) {
        await interaction.reply({ content: '發送 DM 時發生錯誤！', ephemeral: true });
      } else {
        await interaction.followUp({ content: '發送 DM 時發生錯誤！', ephemeral: true });
      }
    }
  }

  // 處理 /report 指令
  if (interaction.commandName === 'report') {
    const issue = interaction.options.getString('issue');
    const reportChannel = await client.channels.fetch(reportChannelId); // 使用你的 reportChannelId

    if (!issue || !reportChannel) {
      if (!hasReplied) {
        return await interaction.reply({ content: '無效的回報內容或頻道！', ephemeral: true });
      }
    }

    try {
      await reportChannel.send(`**回報內容**\n\n${issue}`);

      // 確保只回應一次
      if (!hasReplied) {
        await interaction.reply({ content: '你的回報已成功提交！', ephemeral: true });
      } else {
        await interaction.followUp({ content: '你的回報已成功提交！', ephemeral: true });
      }
    } catch (error) {
      console.error('回報發送時發生錯誤：', error);
      // 確保只回應一次
      if (!hasReplied) {
        await interaction.reply({ content: '發送回報時發生錯誤！', ephemeral: true });
      } else {
        await interaction.followUp({ content: '發送回報時發生錯誤！', ephemeral: true });
      }
    }
  }
});

// 登入 Discord
client.login(token);
