// BASE
const BaseHelper = require('./Base/Helper');
const BaseDiscord = require('./Base/Discord');

const DiscordJS = require('discord.js');
const util = require('util');
const fs = require('fs');

// DATA
const Crons = require('../v2/idle-rpg/Crons');
const Game = require('../v2/idle-rpg/Game');
const Antispam = require('../bots/modules/Antispam');
const CommandParser = require('../bots/utils/CommandParser');
const enumHelper = require('../utils/enumHelper');
const { minimalTimer, maximumTimer, botLoginToken, guildID } = require('../../settings');

// UTILS
const { errorLog, welcomeLog, infoLog } = require('../utils/logger');

/*

  TODO: Change to shards once guild count is approaching 100

*/

class DiscordBot extends BaseHelper {

  constructor() {
    super();
    this.bot = new DiscordJS.Client({
      apiRequestMethod: 'sequential',
      messageCacheMaxSize: 200,
      messageCacheLifetime: 0,
      messageSweepInterval: 0,
      fetchAllMembers: false,
      disableEveryone: false,
      sync: false,
      restWsBridgeTimeout: 5000,
      restTimeOffset: 500
    });
    this.discord = new BaseDiscord(this.bot);
    this.Game = new Game();
    this.Crons = new Crons({ Discord: this });
    this.CommandParser = new CommandParser({
      Game: this.Game,
      Bot: this.bot
    });
    this.onlinePlayers = new DiscordJS.Collection();
    this.loadEventListeners();
    this.bot.login(botLoginToken);
    this.minTimer = (minimalTimer * 1000) * 60;
    this.maxTimer = (maximumTimer * 1000) * 60;
    this.tickInMinutes = 2;
    this.counter = {};
  }

  loadEventListeners() {
    this.bot.on('error', err => errorLog.error(err));
    this.bot.once('ready', () => {
      if (!this.bot.user.avatarURL) { // avatarURL == null if not set
        this.bot.user.setAvatar(fs.readFileSync('./idle-rpg/res/hal.jpg'));
      }
      this.bot.user.setStatus('idle');
      this.discord.loadGuilds();
      this.loadHeartBeat();
      this.Crons.loadCrons();

      this.bot.guilds.forEach(async (guild) => {
        this.Game.loadGuildConfig(guild.id);
        guild.members
          .filter(member => !member.user.bot && member.presence.status !== 'offline' && this.Game.dbClass().shouldBeInList(member.id, member.guild.id))
          .map(member => Object.assign({}, {
            name: member.nickname ? member.nickname : member.displayName,
            discordId: member.id,
            guildId: guild.id,
          }))
          .forEach(member => this.onlinePlayers.set(member.discordId, member));
      }, console.log('Reset all personal multipliers'));
    });

    this.bot.on('message', async (message) => {
      if (message.author.bot) { // Don't listen to bots. Even Idle-RPG himself.
        return;
      }

      if (message.guild && message.guild.id === guildID && message.content.includes('┻━┻')) {
        return message.reply(' ┬─┬ノ(ಠ\\_ಠノ)'.repeat(message.content.split('┻━┻').length - 1));
      }

      if (message.channel.parent && message.channel.parent.name !== 'Idle-RPG') {
        return;
      }

      if (message.content.startsWith('!cs') || message.content.startsWith('!castspell')) {
        await Antispam.logAuthor(message.author.id);
        await Antispam.logMessage(message.author.id, message.content);
        const skip = await Antispam.checkMessageInterval(message);
        if (skip) {
          // infoLog.info(`Spam detected by ${message.author.username}.`);
          return;
        }
      }

      return this.CommandParser.parseUserCommand(message);
    });

    this.bot.on('guildCreate', async (guild) => {
      await this.Game.loadGuildConfig(guild.id);
      await this.discord.manageGuildChannels(guild);
      guild.members
        .filter(member => !member.user.bot && member.presence.status !== 'offline' && this.Game.dbClass().shouldBeInList(member.id, member.guild.id))
        .map(member => Object.assign({}, {
          name: member.nickname ? member.nickname : member.displayName,
          discordId: member.id,
          guildId: guild.id,
        }))
        .forEach(member => this.onlinePlayers.set(member.discordId, member));
    });

    this.bot.on('guildDelete', async (guild) => {
      guild.members.filter(member => this.onlinePlayers.has(member.id))
        .forEach(member => this.onlinePlayers.delete(member.id));
    });

    this.bot.on('guildUnavailable', async (guild) => {
      guild.members.filter(member => this.onlinePlayers.has(member.id))
        .forEach(member => this.onlinePlayers.delete(member.id));
    });

    this.bot.on('presenceUpdate', async (oldMember, newMember) => {
      if (!newMember.user.bot) {
        if (oldMember.presence.status === 'offline' && newMember.presence.status !== 'offline') {
          if (await this.Game.dbClass().shouldBeInList(newMember.id, newMember.guild.id)) {
            if (!this.onlinePlayers.has(newMember.id)) {
              this.onlinePlayers.set(newMember.id, {
                name: newMember.nickname ? newMember.nickname : newMember.displayName,
                discordId: newMember.id,
                guildId: newMember.guild.id,
              });
            }
          }
        }

        if (newMember.presence.status === 'offline' && oldMember.presence.status !== 'offline') {
          if (await this.Game.dbClass().shouldBeInList(newMember.id, newMember.guild.id)) {
            if (this.onlinePlayers.has(newMember.id)) {
              this.onlinePlayers.delete(newMember.id);
            }
          }
        }
      }

      if (newMember.guild.id !== guildID) {
        return;
      }

      // if (((oldMember.presence.game && !oldMember.presence.game.streaming) || !oldMember.presence.game) && newMember.presence.game && newMember.presence.game.streaming) {
      //   const streamChannel = await newMember.guild.channels.find(channel => channel.name === 'stream-plug-ins' && channel.type === 'text');
      //   if (streamChannel) {
      //     streamChannel.send(`${newMember.displayName} has started streaming \`${newMember.presence.game.name}\`! Go check the stream out if you're interested!\n<${newMember.presence.game.url}>`);
      //   }
      // }
    });

    this.bot.on('guildMemberAdd', async (member) => {
      if (member.presence.status !== 'offline') {
        if (await this.Game.dbClass().shouldBeInList(member.id, member.guild.id)) {
          if (!this.onlinePlayers.has(member.id)) {
            this.onlinePlayers.set(member.id, {
              name: member.nickname ? member.nickname : member.displayName,
              discordId: member.id,
              guildId: member.guild.id,
            });
          }
        }
      }

      if (member.guild.id !== guildID) {
        return;
      }

      const welcomeChannel = await member.guild.channels.find(channel => channel.name === 'newcomers' && channel.type === 'text');
      if (welcomeChannel) {
        welcomeChannel.send(`Welcome ${member}! This server has an Idle-RPG bot! If you have any questions check the <#${member.guild.channels.find(channel => channel.name === 'faq' && channel.type === 'text').id}> or PM me !help.`);
        welcomeLog.info(member);
      }
    });

    this.bot.on('guildMemberRemove', (member) => {
      if (this.onlinePlayers.has(member.id)) {
        this.onlinePlayers.delete(member.id);
      }
    });

    this.bot.on('rateLimit', infoLog.info);
  }

  loadHeartBeat() {
    const interval = process.env.NODE_ENV.includes('production') ? this.tickInMinutes : 1;

    setInterval(() => {
      this.processDetails();
      this.bot.guilds.forEach(async (guild) => {
        let guildMinTimer = this.minTimer;
        let guildMaxTimer = this.maxTimer;
        if (process.env.NODE_ENV.includes('production')) {
          const guildOnlineMembers = guild.members
            .filter(member => !member.user.bot && member.presence.status !== 'offline')
            .map(member => Object.assign({}, {
              name: member.nickname ? member.nickname : member.displayName,
              discordId: member.id,
              guildId: guild.id,
            }));

          if (guildOnlineMembers.size >= 50) {
            guildMinTimer = ((Number(minimalTimer) + (Math.floor(guildOnlineMembers.size / 50))) * 1000) * 60;
            guildMaxTimer = ((Number(maximumTimer) + (Math.floor(guildOnlineMembers.size / 50))) * 1000) * 60;
          }
          guild.members.map(member => this.onlinePlayers.get(member.id))
            .filter(member => member && !member.timer && guild.id === member.guildId)
            .forEach((player) => {
              const playerTimer = this.randomBetween(guildMinTimer, guildMaxTimer);
              player.timer = setTimeout(async () => {
                const eventResult = await this.Game.activateEvent(guild.id, player, guildOnlineMembers);
                delete player.timer;
                return this.discord.sendMessage(guild, eventResult);
              }, playerTimer);
            });
        } else {
          enumHelper.mockPlayers.forEach((player) => {
            if (!player.timer) {
              const playerTimer = this.randomBetween(guildMinTimer, guildMaxTimer);
              player.timer = setTimeout(async () => {
                const eventResult = await this.Game.activateEvent(guild.id, player, enumHelper.mockPlayers);
                delete player.timer;
                return this.discord.sendMessage(guild, eventResult);
              }, playerTimer);
            }
          });
        }
      });
      this.bot.user.setActivity(`${process.env.NODE_ENV.includes('production') ? this.onlinePlayers.size : enumHelper.mockPlayers.length + ' mock'} idlers in ${this.bot.guilds.size} guilds`, { type: 'WATCHING' });
    }, 60000 * interval);
  }

  async processDetails() {
    let memoryUsage = await util.inspect(process.memoryUsage());
    memoryUsage = await JSON.parse(memoryUsage.replace('rss', '"rss"').replace('heapTotal', '"heapTotal"').replace('heapUsed', '"heapUsed"').replace('external', '"external"'));
    const currentRSS = await Number(memoryUsage.rss / 1048576).toFixed(2);
    const currentTotal = await Number(memoryUsage.heapTotal / 1048576).toFixed(2);
    const currentUsed = await Number(memoryUsage.heapUsed / 1048576).toFixed(2);

    console.log('------------');
    console.log(`\n\n${new Date()}\nHeap Usage:\n  RSS: ${currentRSS}MB\n  HeapTotal: ${currentTotal}MB\n  HeapUsed: ${currentUsed}MB`);
    console.log(`Current Up Time: ${this.secondsToTimeFormat(Math.floor(process.uptime()))}\n\n`);
    console.log('------------');
  }

  // CRONS
  powerHourBegin() {
    this.bot.guilds.forEach((guild) => {
      const actionsChannel = guild.channels.find(channel => channel.name === 'actions' && channel.type === 'text' && channel.parent.name === 'Idle-RPG');
      if (actionsChannel) {
        actionsChannel.send(this.setImportantMessage('Dark clouds are gathering in the sky. Something is about to happen...'));
      }
    });
    setTimeout(() => {
      this.bot.guilds.forEach((guild) => {
        const actionsChannel = guild.channels.find(channel => channel.name === 'actions' && channel.type === 'text' && channel.parent.name === 'Idle-RPG');
        if (actionsChannel) {
          actionsChannel.send(this.setImportantMessage('You suddenly feel energy building up within the sky, the clouds get darker, you hear monsters screeching nearby! Power Hour has begun!'));
          const guildConfig = this.Game.dbClass().loadGame(guild.id);
          guildConfig.multiplier++;
          this.Game.dbClass().updateGame(guild.id, guildConfig);
        }
      });
    }, 1800000); // 30 minutes

    setTimeout(() => {
      this.bot.guilds.forEach((guild) => {
        const actionsChannel = guild.channels.find(channel => channel.name === 'actions' && channel.type === 'text' && channel.parent.name === 'Idle-RPG');

        if (actionsChannel) {
          actionsChannel.send(this.setImportantMessage('The clouds are disappearing, soothing wind brushes upon your face. Power Hour has ended!'));
          const guildConfig = this.Game.dbClass().loadGame(guild.id);
          guildConfig.multiplier--;
          guildConfig.multiplier = guildConfig.multiplier - 1 <= 0 ? guildConfig.multiplier = 1 : guildConfig.multiplier--;
          this.Game.dbClass().updateGame(guild.id, guildConfig);
        }
      });
    }, 5400000); // 1hr 30 minutes
  }

  disableJoinLottery() {
    this.Game.disableJoinLottery();
  }

  enableJoinLottery() {
    this.Game.enableJoinLottery();
  }

  dailyLottery() {
    if (!process.env.NODE_ENV.includes('production')) {
      return;
    }

    this.bot.guilds.forEach(async (guild) => {
      const guildLotteryPlayers = await this.Game.dbClass().loadLotteryPlayers(guild.id);
      if (!guildLotteryPlayers || guildLotteryPlayers.length <= 1) {
        return;
      }

      const guildConfig = await this.Game.dbClass().loadGame(guild.id);
      const randomWinner = await this.randomBetween(0, guildLotteryPlayers.length - 1);
      const winner = guildLotteryPlayers[randomWinner];

      winner.gold.current += guildConfig.dailyLottery.prizePool;
      winner.gold.total += guildConfig.dailyLottery.prizePool;
      winner.gold.dailyLottery += guildConfig.dailyLottery.prizePool;
      await this.Game.dbClass().savePlayer(winner);

      const prizePool = guildConfig.dailyLottery.prizePool;
      const newPrizePool = await this.randomBetween(1500, 10000);
      guildConfig.dailyLottery.prizePool = newPrizePool;
      await this.Game.dbClass().updateGame(guild.id, guildConfig);
      await this.Game.dbClass().removeLotteryPlayers(guild.id);

      const eventLog = `Congratulations! Out of ${guildLotteryPlayers.length} contestants, you just won ${prizePool} gold from the daily lottery!`;
      await this.logEvent(winner, this.Game.dbClass(), eventLog, enumHelper.logTypes.action);

      const eventMsg = this.setImportantMessage(`Out of ${guildLotteryPlayers.length} contestants, ${winner.name} has won the daily lottery of ${prizePool} gold!`);
      guild.channels.find(channel => channel.name === 'actions' && channel.type === 'text').send(eventMsg);

      const lotteryChannel = await guild.channels.find(channel => channel && channel.name === 'lottery' && channel.type === 'text');
      if (lotteryChannel) {
        let lotteryMessages = await lotteryChannel.fetchMessages({ limit: 10 });
        lotteryMessages = await lotteryMessages.sort((message1, message2) => message1.createdTimestamp - message2.createdTimestamp);
        if (lotteryMessages.size <= 0) {
          await lotteryChannel.send(`Idle-RPG Lottery - You must pay 100 gold to enter! PM me \`!lottery\` to join!\nOut of ${guildLotteryPlayers.length} contestants, ${winner.name} has won the previous daily lottery of ${prizePoolprizePool} gold!`);
          await lotteryChannel.send(`Current lottery prize pool: ${newPrizePool}`);
          await lotteryChannel.send('Contestants:');
        } else {
          await lotteryMessages.array()[0].edit(`Idle-RPG Lottery - You must pay 100 gold to enter! PM me \`!lottery\` to join!\nOut of ${guildLotteryPlayers.length} contestants, ${winner.name} has won the previous daily lottery of ${prizePool} gold!`);
          await lotteryMessages.array()[1].edit(`Current lottery prize pool: ${newPrizePool}`);
          await lotteryMessages.array()[2].edit('Contestants:');
        }
      }

      guildLotteryPlayers.forEach((player) => {
        const discordUser = guild.members.find(member => member.id === player.discordId);
        if (player.discordId !== winner.discordId && discordUser) {
          discordUser.send(`Thank you for participating in the lottery! Unfortunately ${winner.name} has won the prize of ${prizePool} out of ${guildLotteryPlayers.length} people.`);
        } else if (discordUser) {
          discordUser.send(`Thank you for participating in the lottery! You have won the prize of ${prizePool} out of ${guildLotteryPlayers.length} people.`);
        }
      });
    });
  }

  updateLeaderboards() {
    const types = enumHelper.leaderboardStats;
    this.bot.guilds.forEach((guild) => {
      const botGuildMember = guild.members.find(member => member.id === this.bot.user.id);
      if (!botGuildMember.permissions.has([
        'VIEW_CHANNEL',
        'MANAGE_CHANNELS'
      ])) {
        return;
      }
      const leaderboardChannel = guild.channels.find(channel => channel && channel.name === 'leaderboards' && channel.type === 'text' /*&& channel.parent.name === 'Idle-RPG'*/);
      if (!leaderboardChannel || leaderboardChannel && !leaderboardChannel.manageable) {
        return;
      }

      types.forEach((type, index) => this.Game.dbClass().loadTop10(type, guild.id, this.bot.user.id)
        .then(top10 => `${top10.filter(player => Object.keys(type)[0].includes('.') ? player[Object.keys(type)[0].split('.')[0]][Object.keys(type)[0].split('.')[1]] : player[Object.keys(type)[0]] > 0)
          .sort((player1, player2) => {
            if (Object.keys(type)[0] === 'level') {
              return player2.experience.current - player1.experience.current && player2.level - player1.level;
            }

            if (Object.keys(type)[0].includes('.')) {
              const keys = Object.keys(type)[0].split('.');
              return player2[keys[0]][keys[1]] - player1[keys[0]][keys[1]];
            }

            return player2[Object.keys(type)[0]] - player1[Object.keys(type)[0]];
          })
          .map((player, rank) => `Rank ${rank + 1}: ${player.name} - ${Object.keys(type)[0].includes('.') ? `${Object.keys(type)[0].split('.')[0]}: ${player[Object.keys(type)[0].split('.')[0]][Object.keys(type)[0].split('.')[1]]}` : `${Object.keys(type)[0].replace('currentBounty', 'Bounty')}: ${player[Object.keys(type)[0]]}`}`)
          .join('\n')}`)
        .then(async (rankString) => {
          const msgCount = await leaderboardChannel.fetchMessages({ limit: 10 });
          const subjectTitle = this.formatLeaderboards(Object.keys(type)[0]);
          const msg = `\`\`\`Top 10 ${subjectTitle}:
${rankString}\`\`\``;

          if (msgCount.size < types.length) {
            return leaderboardChannel.send(msg);
          }

          return !msg.includes(msgCount.array()[index].toString()) && msgCount.array()[index].author.id === this.bot.user.id
            ? msgCount.array()[index].edit(msg)
            : '';
        }));
    });
  }

  blizzardRandom() {
    this.bot.guilds.forEach(async (guild) => {
      const blizzardDice = this.randomBetween(0, 99);
      const guildConfig = await this.Game.dbClass().loadGame(guild.id);
      if (blizzardDice <= 15 && !guildConfig.events.isBlizzardActive) {
        let actionChannel = guild.channels.find(channel => channel && channel.name === 'actions' && channel.type === 'text');
        if (actionChannel) {
          actionChannel.send('```css A blizzard has just begun!```');
        }
        guildConfig.events.isBlizzardActive = true;
        await this.Game.dbClass().updateGame(guild.id, guildConfig);
        setTimeout(() => {
          actionChannel = guild.channels.find(channel => channel && channel.name === 'actions' && channel.type === 'text');
          if (actionChannel) {
            actionChannel.send('```css The blizzard has ended!```');
          }
          guildConfig.events.isBlizzardActive = false;
          this.Game.dbClass().updateGame(guild.id, guildConfig);
        }, this.randomBetween(7200000, 72000000)); // 2-20hrs
      }
    });
  }

}
module.exports = new DiscordBot();
