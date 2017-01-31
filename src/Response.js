const Discord = require("discord.js")

class Response {
    constructor(bot, message, matches) {
        this._bot = bot
        this._message = message
        this._matches = matches
    }

    get bot() {
        return this._bot
    }

    get message() {
        return this._message
    }

    get authorId() {
        return this._message.author.id
    }

    get author() {
        return this._message.author
    }

    get serverId() {
        return this._message.guild.id
    }

    get server() {
        return this._message.guild
    }

    get channelId() {
        return this._message.channel.id
    }

    get channel() {
        return this._message.channel
    }

    get matches() {
        return this._matches
    }

    send(message) {
        return this.bot.sendMessageToChannel(this.message.channel, message)
    }

    reply(message) {
        return this.send(`<@${this.authorId}> ${message}`)
    }

    random(messages) {
        let message = messages[Math.floor(Math.random() * messages.length)]
        this.send(message)
    }

    sendDirectMessage(message) {
        return this.bot.user(this.authorId).sendMessage(message)
    }

    sendEmbed(message, callback) {
        let embed = new Discord.RichEmbed()
        callback(embed)
        this.channel.sendEmbed(embed, message)
    }

    get authorIsAdministrator() {
        return this.bot.isAdministrator(this.author)
    }

    get authorIsServerAdministrator() {
        return this.bot.isServerAdministrator(this.server, this.author)
    }

    canI(permissions) {
        return this.bot.canI(this.server, permissions)
    }

    authorHasPermission(permissions) {
        return this.bot.hasPermission(this.server, this.author, permissions)
    }

    get db() {
        return this.bot.db(this)
    }
}

module.exports = Response
